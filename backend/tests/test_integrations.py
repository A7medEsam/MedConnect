import json
import os
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

# Isolate database and uploads in a temp directory BEFORE importing app modules
_TEST_TMPDIR = tempfile.TemporaryDirectory(prefix="medconnect_test_")
_TEST_DB_PATH = Path(_TEST_TMPDIR.name) / "test_medconnect.db"
_TEST_UPLOAD_DIR = Path(_TEST_TMPDIR.name) / "uploads"
_TEST_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH.as_posix()}"
os.environ["UPLOAD_DIR"] = str(_TEST_UPLOAD_DIR)

import httpx2  # noqa: E402
from app import database, models  # noqa: E402
from app.main import app  # noqa: E402
from app.services import gemini_service  # noqa: E402


class MedConnectIntegrationTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        assert "test_medconnect.db" in str(database.engine.url)
        database.init_db()

    @classmethod
    def tearDownClass(cls):
        database.engine.dispose()
        _TEST_TMPDIR.cleanup()

    async def _register_user(self, client: httpx2.AsyncClient, username: str, role: str) -> dict:
        resp = await client.post(
            "/api/auth/register",
            json={
                "username": username,
                "email": f"{username}@example.com",
                "full_name": f"Test {username}",
                "password": "Password123!",
                "role": role,
                "language": "en",
            },
        )
        self.assertEqual(resp.status_code, 201, resp.text)
        return resp.json()

    async def test_health_and_report_reanalysis_preserves_prior_result(self):
        transport = httpx2.ASGITransport(app=app)
        async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
            health = await client.get("/api/health")
            self.assertEqual(health.status_code, 200)
            hjson = health.json()
            self.assertEqual(hjson["status"], "ok")
            self.assertNotIn("AIza", json.dumps(hjson))

            patient = await self._register_user(client, "pat_health", "patient")
            headers = {"Authorization": f"Bearer {patient['access_token']}"}

            up = await client.post(
                "/api/reports/upload",
                headers=headers,
                files={"file": ("lab.pdf", b"%PDF-1.4\n%test\n", "application/pdf")},
            )
            self.assertEqual(up.status_code, 201, up.text)
            rep_id = up.json()["id"]

            mock_report_out = {
                "result": {
                    "schema_version": "bilingual_v2",
                    "summary": {"en": "Normal lab", "ar": "تحليل طبيعي"},
                },
                "model_used": "gemini-3.8-flash",
            }
            with patch("app.services.gemini_service.analyze_medical_report", return_value=mock_report_out):
                ok_res = await client.post(f"/api/reports/{rep_id}/analyze", headers=headers, json={"language": "en"})
                self.assertEqual(ok_res.status_code, 200, ok_res.text)
                self.assertEqual(ok_res.json()["status"], "analyzed")

            with patch(
                "app.services.gemini_service.analyze_medical_report",
                side_effect=gemini_service.GeminiServiceError(
                    "quota_exceeded", status_code=429, retry_after_seconds=42, retryable=False
                ),
            ):
                fail_res = await client.post(f"/api/reports/{rep_id}/analyze", headers=headers, json={"language": "en"})
                self.assertEqual(fail_res.status_code, 429)

            saved = (await client.get(f"/api/reports/{rep_id}", headers=headers)).json()
            self.assertEqual(saved["status"], "analyzed")
            self.assertIsNotNone(saved["analysis"])
            self.assertEqual(saved["last_error"]["category"], "quota_exceeded")
            self.assertEqual(saved["last_error"]["retry_after_seconds"], 42)

    async def test_qr_lifecycle_authorization_scoping_revocation_and_expiry(self):
        transport = httpx2.ASGITransport(app=app)
        async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
            pat1 = await self._register_user(client, "qr_pat1", "patient")
            pat2 = await self._register_user(client, "qr_pat2", "patient")
            doc = await self._register_user(client, "qr_doc1", "doctor")

            p1_headers = {"Authorization": f"Bearer {pat1['access_token']}"}
            p2_headers = {"Authorization": f"Bearer {pat2['access_token']}"}
            doc_headers = {"Authorization": f"Bearer {doc['access_token']}"}

            # Add condition + upload PDF for pat1 and upload private PDF for pat2
            await client.post(
                "/api/patient/conditions",
                headers=p1_headers,
                json={"name": "Hypertension", "status": "active"},
            )
            p1_rep = (
                await client.post(
                    "/api/reports/upload",
                    headers=p1_headers,
                    files={"file": ("p1_report.pdf", b"%PDF-1.4 PAT1 REPORT", "application/pdf")},
                )
            ).json()
            p2_rep = (
                await client.post(
                    "/api/reports/upload",
                    headers=p2_headers,
                    files={"file": ("p2_secret.pdf", b"%PDF-1.4 PAT2 SECRET", "application/pdf")},
                )
            ).json()

            # Unauthenticated and wrong-role checks
            self.assertEqual((await client.get("/api/qr/tokens")).status_code, 401)
            self.assertEqual(
                (await client.post("/api/qr/tokens", headers=doc_headers, json={"scope": ["profile"], "expires_minutes": 30})).status_code,
                403,
            )
            self.assertEqual(
                (await client.post("/api/qr/access", headers=p1_headers, json={"token": "MC-fake-token-12345"})).status_code,
                403,
            )

            # Create full-scope QR token
            created = await client.post(
                "/api/qr/tokens",
                headers=p1_headers,
                json={"scope": ["profile", "conditions", "reports"], "expires_minutes": 60},
            )
            self.assertEqual(created.status_code, 201, created.text)
            cjson = created.json()
            raw_token = cjson["access_token"]
            token_id = cjson["id"]
            self.assertTrue(raw_token.startswith("MC-"))
            self.assertEqual(cjson["status"], "active")

            # Ensure plaintext token is never stored in DB
            db = database.SessionLocal()
            try:
                tok_row = db.query(models.QrAccessToken).filter(models.QrAccessToken.id == token_id).first()
                self.assertIsNotNone(tok_row)
                self.assertNotEqual(tok_row.token_hash, raw_token)
            finally:
                db.close()

            # Doctor redeems token
            redeemed = await client.post(
                "/api/qr/access",
                headers=doc_headers,
                json={"token": raw_token},
            )
            self.assertEqual(redeemed.status_code, 200, redeemed.text)
            rjson = redeemed.json()
            self.assertEqual(rjson["scope"], ["profile", "conditions", "reports"])
            self.assertEqual(len(rjson["conditions"]), 1)
            self.assertEqual(rjson["conditions"][0]["name"], "Hypertension")
            self.assertEqual(len(rjson["reports"]), 1)
            self.assertNotIn("medications", rjson)
            self.assertNotIn("allergies", rjson)

            # Doctor downloads scoped report file via X-QR-Token
            dl_ok = await client.get(
                f"/api/qr/reports/{p1_rep['id']}/file",
                headers={**doc_headers, "X-QR-Token": raw_token},
            )
            self.assertEqual(dl_ok.status_code, 200)
            self.assertEqual(dl_ok.content, b"%PDF-1.4 PAT1 REPORT")

            # Cross-patient isolation: cannot access pat2's report using pat1's token
            dl_other = await client.get(
                f"/api/qr/reports/{p2_rep['id']}/file",
                headers={**doc_headers, "X-QR-Token": raw_token},
            )
            self.assertEqual(dl_other.status_code, 404)

            # Limited-scope QR token (profile only -> must exclude conditions and block report file download)
            limited_tok = (
                await client.post(
                    "/api/qr/tokens",
                    headers=p1_headers,
                    json={"scope": ["profile"], "expires_minutes": 15},
                )
            ).json()["access_token"]
            lim_redeem = await client.post("/api/qr/access", headers=doc_headers, json={"token": limited_tok})
            self.assertEqual(lim_redeem.status_code, 200)
            self.assertIn("profile", lim_redeem.json())
            self.assertNotIn("conditions", lim_redeem.json())
            self.assertNotIn("reports", lim_redeem.json())
            lim_file = await client.get(
                f"/api/qr/reports/{p1_rep['id']}/file",
                headers={**doc_headers, "X-QR-Token": limited_tok},
            )
            self.assertEqual(lim_file.status_code, 403)

            # Patient lists tokens and verifies granted audit log
            listed = await client.get("/api/qr/tokens", headers=p1_headers)
            self.assertEqual(listed.status_code, 200)
            tok_entry = next(item for item in listed.json() if item["id"] == token_id)
            self.assertTrue(any(lg["action"] == "granted" for lg in tok_entry["logs"]))

            # Other patient cannot revoke pat1's token
            self.assertEqual((await client.delete(f"/api/qr/tokens/{token_id}", headers=p2_headers)).status_code, 404)

            # Pat1 revokes token -> doctor redemption & file download blocked (403) + logged as denied_revoked
            rev = await client.delete(f"/api/qr/tokens/{token_id}", headers=p1_headers)
            self.assertEqual(rev.status_code, 200)
            self.assertEqual(rev.json()["status"], "revoked")

            rev_redeem = await client.post("/api/qr/access", headers=doc_headers, json={"token": raw_token})
            self.assertEqual(rev_redeem.status_code, 403)
            rev_file = await client.get(
                f"/api/qr/reports/{p1_rep['id']}/file",
                headers={**doc_headers, "X-QR-Token": raw_token},
            )
            self.assertEqual(rev_file.status_code, 403)

            # Expiry test: backdate limited_tok in DB and confirm status + 403 denial
            exp_created = await client.post(
                "/api/qr/tokens",
                headers=p1_headers,
                json={"scope": ["profile", "reports"], "expires_minutes": 15},
            )
            exp_id = exp_created.json()["id"]
            exp_raw = exp_created.json()["access_token"]
            db = database.SessionLocal()
            try:
                exp_row = db.query(models.QrAccessToken).filter(models.QrAccessToken.id == exp_id).first()
                exp_row.expires_at = datetime.utcnow() - timedelta(minutes=2)
                db.commit()
            finally:
                db.close()

            exp_redeem = await client.post("/api/qr/access", headers=doc_headers, json={"token": exp_raw})
            self.assertEqual(exp_redeem.status_code, 403)
            exp_file = await client.get(
                f"/api/qr/reports/{p1_rep['id']}/file",
                headers={**doc_headers, "X-QR-Token": exp_raw},
            )
            self.assertEqual(exp_file.status_code, 403)

            listed_after = (await client.get("/api/qr/tokens", headers=p1_headers)).json()
            exp_entry = next(item for item in listed_after if item["id"] == exp_id)
            self.assertEqual(exp_entry["status"], "expired")
            self.assertTrue(any(lg["action"] == "denied_expired" for lg in exp_entry["logs"]))

    async def test_community_post_create_edit_report_and_permissions(self):
        transport = httpx2.ASGITransport(app=app)
        async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
            u1 = await self._register_user(client, "comm_u1", "patient")
            u2 = await self._register_user(client, "comm_u2", "doctor")
            u1_headers = {"Authorization": f"Bearer {u1['access_token']}"}
            u2_headers = {"Authorization": f"Bearer {u2['access_token']}"}

            # Create post as u1
            created = await client.post(
                "/api/community/posts",
                headers=u1_headers,
                json={
                    "title": "Managing Hypertension Daily",
                    "body": "Tracking blood pressure each morning helps spot trends.",
                    "channel_id": "cardiology",
                    "post_type": "discussion",
                },
            )
            self.assertEqual(created.status_code, 201, created.text)
            post = created.json()
            post_id = post["id"]
            self.assertTrue(post["is_owner"])

            # Edit own post as u1 (including post_type & channel_id)
            edited = await client.put(
                f"/api/community/posts/{post_id}",
                headers=u1_headers,
                json={
                    "title": "Managing BP Every Morning",
                    "body": "Updated guide on home cuff positioning and morning readings.",
                    "channel_id": "gp",
                    "post_type": "question",
                },
            )
            self.assertEqual(edited.status_code, 200, edited.text)
            self.assertEqual(edited.json()["title"], "Managing BP Every Morning")
            self.assertEqual(edited.json()["channel_id"], "gp")
            self.assertEqual(edited.json()["post_type"], "question")

            # Whitespace-only edit rejected
            bad_edit = await client.put(
                f"/api/community/posts/{post_id}",
                headers=u1_headers,
                json={"title": "   ", "body": "Valid enough body text"},
            )
            self.assertEqual(bad_edit.status_code, 422)

            # u2 sees is_owner=False and cannot edit or delete u1's post
            u2_list = (await client.get("/api/community/posts", headers=u2_headers)).json()
            seen = next(item for item in u2_list if item["id"] == post_id)
            self.assertFalse(seen["is_owner"])

            self.assertEqual(
                (
                    await client.put(
                        f"/api/community/posts/{post_id}",
                        headers=u2_headers,
                        json={"title": "Hijacked Title"},
                    )
                ).status_code,
                403,
            )
            self.assertEqual(
                (await client.delete(f"/api/community/posts/{post_id}", headers=u2_headers)).status_code,
                403,
            )

            # Cannot edit seeded demo post
            demo_post = next((item for item in u2_list if item["is_demo"]), None)
            self.assertIsNotNone(demo_post)
            self.assertEqual(
                (
                    await client.put(
                        f"/api/community/posts/{demo_post['id']}",
                        headers=u1_headers,
                        json={"title": "Overwrite Demo"},
                    )
                ).status_code,
                403,
            )

            # Report post as u2 -> report_count increments, duplicate blocked with 409
            rep1 = await client.post(
                f"/api/community/posts/{post_id}/report",
                headers=u2_headers,
                json={"reason": "Needs clinical disclaimer"},
            )
            self.assertEqual(rep1.status_code, 200, rep1.text)
            self.assertTrue(rep1.json()["reported"])
            self.assertEqual(rep1.json()["report_count"], 1)

            rep2 = await client.post(
                f"/api/community/posts/{post_id}/report",
                headers=u2_headers,
                json={"reason": "Duplicate report"},
            )
            self.assertEqual(rep2.status_code, 409)

    async def test_mentor_error_persistence_and_history_preservation(self):
        transport = httpx2.ASGITransport(app=app)
        async with httpx2.AsyncClient(transport=transport, base_url="http://test") as client:
            doc = await self._register_user(client, "mentor_doc", "doctor")
            doc_headers = {"Authorization": f"Bearer {doc['access_token']}"}

            # 1. Successful Mentor analysis
            mock_mentor_ok = {
                "result": {
                    "supported_report_type": True,
                    "report_title": {"en": "Sample ECG", "ar": "تخطيط قلب"},
                    "report_type": {"en": "ECG", "ar": "تخطيط قلب"},
                    "guidelines": ["ESC"],
                    "sample_measures": [],
                    "pathophysiology": {"physiology": {"en": "A", "ar": "أ"}, "pathology": {"en": "B", "ar": "ب"}},
                    "differentials": [],
                    "decision": {"intervene": {"en": "C", "ar": "ج"}, "observe": {"en": "D", "ar": "د"}},
                    "pitfalls": {"refs": {"en": "E", "ar": "هـ"}, "pitfalls": []},
                    "pearls": {"pearls": [], "patient_script": {"en": "F", "ar": "و"}},
                    "quiz": [],
                },
                "model_used": "gemini-3.8-flash",
            }
            with patch("app.services.gemini_service.analyze_mentor_report", return_value=mock_mentor_ok):
                ok = await client.post(
                    "/api/mentor/analyze",
                    headers=doc_headers,
                    data={"report_type": "ecg", "language": "en"},
                    files={"file": ("ecg1.pdf", b"%PDF-1.4 ECG1", "application/pdf")},
                )
            self.assertEqual(ok.status_code, 201, ok.text)
            ok_report_id = ok.json()["report_id"]

            # 2. Failed Mentor analysis (structured GeminiServiceError 503)
            with patch(
                "app.services.gemini_service.analyze_mentor_report",
                side_effect=gemini_service.GeminiServiceError(
                    "service_unavailable", status_code=503, retry_after_seconds=25, retryable=True, request_id="mc-ai-test503"
                ),
            ):
                fail1 = await client.post(
                    "/api/mentor/analyze",
                    headers=doc_headers,
                    data={"report_type": "ecg", "language": "en"},
                    files={"file": ("ecg_fail.pdf", b"%PDF-1.4 ECG_FAIL", "application/pdf")},
                )
            self.assertEqual(fail1.status_code, 503)

            # 3. Failed Mentor analysis (unexpected RuntimeError -> fallback structured error)
            with patch("app.services.gemini_service.analyze_mentor_report", side_effect=RuntimeError("unexpected")):
                fail2 = await client.post(
                    "/api/mentor/analyze",
                    headers=doc_headers,
                    data={"report_type": "blood", "language": "ar"},
                    files={"file": ("blood_fail.pdf", b"%PDF-1.4 BLOOD_FAIL", "application/pdf")},
                )
            self.assertEqual(fail2.status_code, 503)

            # Verify DB persistence: first report analyzed/clean, failed reports have status='error' & structured last_error_json
            reports = (await client.get("/api/reports", headers=doc_headers)).json()
            by_name = {r["original_filename"]: r for r in reports}

            self.assertEqual(by_name["ecg1.pdf"]["id"], ok_report_id)
            self.assertEqual(by_name["ecg1.pdf"]["status"], "analyzed")
            self.assertIsNone(by_name["ecg1.pdf"]["last_error"])

            self.assertEqual(by_name["ecg_fail.pdf"]["status"], "error")
            self.assertEqual(by_name["ecg_fail.pdf"]["last_error"]["category"], "service_unavailable")
            self.assertEqual(by_name["ecg_fail.pdf"]["last_error"]["retry_after_seconds"], 25)
            self.assertEqual(by_name["ecg_fail.pdf"]["last_error"]["request_id"], "mc-ai-test503")
            self.assertIn("ar", by_name["ecg_fail.pdf"]["last_error"]["message"])
            self.assertIn("en", by_name["ecg_fail.pdf"]["last_error"]["message"])

            self.assertEqual(by_name["blood_fail.pdf"]["status"], "error")
            self.assertEqual(by_name["blood_fail.pdf"]["last_error"]["category"], "service_unavailable")

            # Verify previous successful Mentor analysis history is preserved
            hist = await client.get("/api/mentor/history", headers=doc_headers)
            self.assertEqual(hist.status_code, 200)
            self.assertEqual(len(hist.json()), 1)
            self.assertEqual(hist.json()[0]["original_filename"], "ecg1.pdf")


if __name__ == "__main__":
    unittest.main(verbosity=2)
