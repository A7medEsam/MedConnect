import React, { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Activity, Pill, AlertTriangle, Heart } from 'lucide-react';
import AppLayout from '../../layouts/AppLayout';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { useToast } from '../../components/Toast';

export default function PatientProfilePage() {
  const { refreshUser } = useAuth();
  const { t } = useLang();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [personal, setPersonal] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    blood_type: '',
    height_cm: '',
    weight_kg: '',
    phone: '',
    emergency_contact: '',
    medical_notes: '',
  });

  const [conditions, setConditions] = useState([]);
  const [medications, setMedications] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [vitals, setVitals] = useState([]);

  const [newCondition, setNewCondition] = useState({ name: '', status: 'active', diagnosed_date: '', notes: '' });
  const [newMedication, setNewMedication] = useState({ name: '', dosage: '', frequency: '', start_date: '' });
  const [newAllergy, setNewAllergy] = useState({ allergen: '', severity: 'mild', reaction: '' });
  const [newVital, setNewVital] = useState({ vital_type: 'heart_rate', value: '', unit: 'bpm', notes: '' });

  const loadProfile = async () => {
    try {
      const data = await api.getPatientProfile();
      const u = data.user || {};
      const p = data.profile || {};
      setPersonal({
        full_name: u.full_name || '',
        date_of_birth: p.date_of_birth || '',
        gender: p.gender || '',
        blood_type: p.blood_type || '',
        height_cm: p.height_cm ?? '',
        weight_kg: p.weight_kg ?? '',
        phone: p.phone || '',
        emergency_contact: p.emergency_contact || '',
        medical_notes: p.medical_notes || '',
      });
      setConditions(data.conditions || []);
      setMedications(data.medications || []);
      setAllergies(data.allergies || []);
      setVitals(data.vitals || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSavePersonal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updatePatientProfile({
        ...personal,
        height_cm: personal.height_cm === '' ? null : Number(personal.height_cm),
        weight_kg: personal.weight_kg === '' ? null : Number(personal.weight_kg),
      });
      await refreshUser();
      toast.success(t.profile.savedSuccess);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCondition = async (e) => {
    e.preventDefault();
    if (!newCondition.name.trim()) return;
    try {
      const created = await api.addCondition(newCondition);
      setConditions([created, ...conditions]);
      setNewCondition({ name: '', status: 'active', diagnosed_date: '', notes: '' });
      toast.success(t.common.add);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteCondition = async (id) => {
    try {
      await api.deleteCondition(id);
      setConditions(conditions.filter((c) => c.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddMedication = async (e) => {
    e.preventDefault();
    if (!newMedication.name.trim()) return;
    try {
      const created = await api.addMedication(newMedication);
      setMedications([created, ...medications]);
      setNewMedication({ name: '', dosage: '', frequency: '', start_date: '' });
      toast.success(t.common.add);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteMedication = async (id) => {
    try {
      await api.deleteMedication(id);
      setMedications(medications.filter((m) => m.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddAllergy = async (e) => {
    e.preventDefault();
    if (!newAllergy.allergen.trim()) return;
    try {
      const created = await api.addAllergy(newAllergy);
      setAllergies([created, ...allergies]);
      setNewAllergy({ allergen: '', severity: 'mild', reaction: '' });
      toast.success(t.common.add);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteAllergy = async (id) => {
    try {
      await api.deleteAllergy(id);
      setAllergies(allergies.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const defaultUnitForType = {
    heart_rate: 'bpm',
    blood_pressure: 'mmHg',
    glucose: 'mg/dL',
    oxygen: '%',
    weight: 'kg',
    temperature: '°C',
  };

  const handleAddVital = async (e) => {
    e.preventDefault();
    if (!newVital.value.trim()) return;
    try {
      const created = await api.addVital(newVital);
      setVitals([created, ...vitals]);
      setNewVital({ ...newVital, value: '', notes: '' });
      toast.success(t.common.add);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteVital = async (id) => {
    try {
      await api.deleteVital(id);
      setVitals(vitals.filter((v) => v.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="spinner" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.profile.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.profile.subtitle}</p>
        </div>

        {/* Personal Info Form */}
        <form onSubmit={handleSavePersonal} className="card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {t.profile.personalInfo}
            </h2>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? t.common.saving : t.common.save}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.auth.fullName}
              </label>
              <input
                type="text"
                required
                value={personal.full_name}
                onChange={(e) => setPersonal({ ...personal, full_name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.profile.dateOfBirth}
              </label>
              <input
                type="date"
                value={personal.date_of_birth}
                onChange={(e) => setPersonal({ ...personal, date_of_birth: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.profile.gender}
              </label>
              <select
                value={personal.gender}
                onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                className="input-field"
              >
                <option value="">--</option>
                <option value="Female">{t.profile.genderFemale}</option>
                <option value="Male">{t.profile.genderMale}</option>
                <option value="Other">{t.profile.genderOther}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.profile.bloodType}
              </label>
              <select
                value={personal.blood_type}
                onChange={(e) => setPersonal({ ...personal, blood_type: e.target.value })}
                className="input-field"
              >
                <option value="">--</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.profile.heightCm}
              </label>
              <input
                type="number"
                step="0.1"
                value={personal.height_cm}
                onChange={(e) => setPersonal({ ...personal, height_cm: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.profile.weightKg}
              </label>
              <input
                type="number"
                step="0.1"
                value={personal.weight_kg}
                onChange={(e) => setPersonal({ ...personal, weight_kg: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.profile.phone}
              </label>
              <input
                type="text"
                value={personal.phone}
                onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.profile.emergencyContact}
              </label>
              <input
                type="text"
                value={personal.emergency_contact}
                onChange={(e) => setPersonal({ ...personal, emergency_contact: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {t.profile.medicalNotes}
            </label>
            <textarea
              rows={2}
              value={personal.medical_notes}
              onChange={(e) => setPersonal({ ...personal, medical_notes: e.target.value })}
              className="input-field"
            />
          </div>
        </form>

        {/* Conditions & Medications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conditions */}
          <div className="card space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              <span>{t.profile.conditionsTitle}</span>
            </h2>
            <form onSubmit={handleAddCondition} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder={t.profile.conditionName}
                value={newCondition.name}
                onChange={(e) => setNewCondition({ ...newCondition, name: e.target.value })}
                className="input-field sm:col-span-2 text-sm"
              />
              <select
                value={newCondition.status}
                onChange={(e) => setNewCondition({ ...newCondition, status: e.target.value })}
                className="input-field text-sm"
              >
                <option value="active">{t.profile.statusActive}</option>
                <option value="managed">{t.profile.statusManaged}</option>
                <option value="resolved">{t.profile.statusResolved}</option>
              </select>
              <input
                type="text"
                placeholder={t.common.notes}
                value={newCondition.notes}
                onChange={(e) => setNewCondition({ ...newCondition, notes: e.target.value })}
                className="input-field sm:col-span-2 text-sm"
              />
              <button type="submit" className="btn-primary text-sm inline-flex items-center justify-center gap-1">
                <Plus className="w-4 h-4" />
                <span>{t.common.add}</span>
              </button>
            </form>

            <div className="space-y-2">
              {conditions.length === 0 ? (
                <p className="text-sm text-slate-400">{t.common.noData}</p>
              ) : (
                conditions.map((c) => (
                  <div key={c.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-slate-800">{c.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">{c.status}</span>
                        {c.is_demo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{t.common.demoBadge}</span>}
                      </div>
                      {c.notes && <p className="text-xs text-slate-500 mt-1">{c.notes}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCondition(c.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Medications */}
          <div className="card space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Pill className="w-5 h-5 text-sky-600" />
              <span>{t.profile.medicationsTitle}</span>
            </h2>
            <form onSubmit={handleAddMedication} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder={t.profile.medicationName}
                value={newMedication.name}
                onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                className="input-field text-sm"
              />
              <input
                type="text"
                placeholder={t.profile.dosage}
                value={newMedication.dosage}
                onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                className="input-field text-sm"
              />
              <input
                type="text"
                placeholder={t.profile.frequency}
                value={newMedication.frequency}
                onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
                className="input-field text-sm"
              />
              <button type="submit" className="btn-primary text-sm inline-flex items-center justify-center gap-1">
                <Plus className="w-4 h-4" />
                <span>{t.common.add}</span>
              </button>
            </form>

            <div className="space-y-2">
              {medications.length === 0 ? (
                <p className="text-sm text-slate-400">{t.common.noData}</p>
              ) : (
                medications.map((m) => (
                  <div key={m.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-slate-800">{m.name}</span>
                        {m.dosage && <span className="text-xs text-sky-700 font-medium">{m.dosage}</span>}
                        {m.is_demo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{t.common.demoBadge}</span>}
                      </div>
                      {m.frequency && <p className="text-xs text-slate-500 mt-0.5">{m.frequency}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMedication(m.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Allergies & Vitals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Allergies */}
          <div className="card space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>{t.profile.allergiesTitle}</span>
            </h2>
            <form onSubmit={handleAddAllergy} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder={t.profile.allergen}
                value={newAllergy.allergen}
                onChange={(e) => setNewAllergy({ ...newAllergy, allergen: e.target.value })}
                className="input-field sm:col-span-2 text-sm"
              />
              <select
                value={newAllergy.severity}
                onChange={(e) => setNewAllergy({ ...newAllergy, severity: e.target.value })}
                className="input-field text-sm"
              >
                <option value="mild">{t.profile.severityMild}</option>
                <option value="moderate">{t.profile.severityModerate}</option>
                <option value="severe">{t.profile.severitySevere}</option>
              </select>
              <input
                type="text"
                placeholder={t.profile.reaction}
                value={newAllergy.reaction}
                onChange={(e) => setNewAllergy({ ...newAllergy, reaction: e.target.value })}
                className="input-field sm:col-span-2 text-sm"
              />
              <button type="submit" className="btn-primary text-sm inline-flex items-center justify-center gap-1">
                <Plus className="w-4 h-4" />
                <span>{t.common.add}</span>
              </button>
            </form>

            <div className="space-y-2">
              {allergies.length === 0 ? (
                <p className="text-sm text-slate-400">{t.common.noData}</p>
              ) : (
                allergies.map((a) => (
                  <div key={a.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-slate-800">{a.allergen}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">{a.severity}</span>
                        {a.is_demo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{t.common.demoBadge}</span>}
                      </div>
                      {a.reaction && <p className="text-xs text-slate-500 mt-0.5">{a.reaction}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAllergy(a.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Vitals */}
          <div className="card space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-600" />
              <span>{t.profile.vitalsTitle}</span>
            </h2>
            <form onSubmit={handleAddVital} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select
                value={newVital.vital_type}
                onChange={(e) => {
                  const type = e.target.value;
                  setNewVital({
                    ...newVital,
                    vital_type: type,
                    unit: defaultUnitForType[type] || '',
                  });
                }}
                className="input-field sm:col-span-2 text-sm"
              >
                {Object.entries(t.profile.vitalTypes).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <input
                type="text"
                required
                placeholder={t.profile.vitalValue}
                value={newVital.value}
                onChange={(e) => setNewVital({ ...newVital, value: e.target.value })}
                className="input-field text-sm"
              />
              <button type="submit" className="btn-primary text-sm inline-flex items-center justify-center gap-1">
                <Plus className="w-4 h-4" />
                <span>{t.common.add}</span>
              </button>
            </form>

            <div className="space-y-2">
              {vitals.length === 0 ? (
                <p className="text-sm text-slate-400">{t.common.noData}</p>
              ) : (
                vitals.map((v) => (
                  <div key={v.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-slate-800">
                          {t.profile.vitalTypes[v.vital_type] || v.vital_type}
                        </span>
                        <span className="text-sm font-bold text-primary-700">
                          {v.value} {v.unit}
                        </span>
                        {v.is_demo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{t.common.demoBadge}</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(v.recorded_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteVital(v.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
