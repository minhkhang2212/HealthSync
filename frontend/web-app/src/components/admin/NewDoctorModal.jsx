import React, { useEffect, useMemo, useState } from 'react';
import apiClient, { getApiAssetBase } from '../../utils/apiClient';

const initialForm = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    imageFile: null,
    removeImage: false,
    gender: '',
    specialtyId: '',
    clinicId: '',
    positionId: '',
    priceId: '',
    paymentId: '',
    provinceId: '',
    note: '',
    password: 'password123',
};

const sectionTitle = (title) => (
    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
        <span className="inline-block h-7 w-1 rounded bg-primary"></span>
        {title}
    </h3>
);

const getAllcodeLabel = (item) => item?.valueEn || item?.valueVi || item?.key || '';

const buildErrorMessage = (error, fallback) => {
    const errors = error?.response?.data?.errors;
    if (errors && typeof errors === 'object') {
        return Object.values(errors).flat().join(' ');
    }

    return error?.response?.data?.message || fallback;
};

const splitDoctorName = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return { firstName: '', lastName: '' };
    }

    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }

    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
    };
};

const resolveImageSource = (value, apiAssetBase) => {
    if (!value || typeof value !== 'string') return '';
    const trimmed = value.trim().replace(/\\/g, '/');
    if (!trimmed) return '';
    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/')) return apiAssetBase ? `${apiAssetBase}${trimmed}` : trimmed;
    if (trimmed.startsWith('storage/')) return apiAssetBase ? `${apiAssetBase}/${trimmed}` : `/${trimmed}`;
    if (trimmed.startsWith('public/storage/')) {
        const path = trimmed.replace(/^public/, '');
        return apiAssetBase ? `${apiAssetBase}${path}` : path;
    }
    return `data:image/jpeg;base64,${trimmed}`;
};

const mapDoctorToForm = (doctor) => {
    if (!doctor) {
        return initialForm;
    }

    const { firstName, lastName } = splitDoctorName(doctor.name);
    const doctorInfor = doctor.doctor_infor || doctor.doctorInfor || {};
    const relations = doctor.doctor_clinic_specialties || doctor.doctorClinicSpecialties || [];
    const relation = relations[0] || {};

    return {
        firstName,
        lastName,
        email: doctor.email || '',
        phoneNumber: doctor.phoneNumber || '',
        imageFile: null,
        removeImage: false,
        gender: doctor.gender || '',
        specialtyId: relation.specialtyId ? String(relation.specialtyId) : relation.specialty?.id ? String(relation.specialty.id) : '',
        clinicId: relation.clinicId ? String(relation.clinicId) : relation.clinic?.id ? String(relation.clinic.id) : '',
        positionId: doctor.positionId || '',
        priceId: doctorInfor.priceId || '',
        paymentId: doctorInfor.paymentId || '',
        provinceId: doctorInfor.provinceId || '',
        note: doctorInfor.note || '',
        password: 'password123',
    };
};

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

const NewDoctorModal = ({
    isOpen,
    onClose,
    clinics,
    specialties,
    onCreated,
    onUpdated,
    mode = 'create',
    doctor = null,
}) => {
    const isEdit = mode === 'edit';
    const [formData, setFormData] = useState(initialForm);
    const [photoPreview, setPhotoPreview] = useState('');
    const [allcodes, setAllcodes] = useState({
        POSITION: [],
        PRICE: [],
        PAYMENT: [],
        PROVINCE: [],
    });
    const [allcodesLoading, setAllcodesLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const apiAssetBase = useMemo(() => getApiAssetBase(), []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        if (
            allcodes.POSITION.length > 0 ||
            allcodes.PRICE.length > 0 ||
            allcodes.PAYMENT.length > 0 ||
            allcodes.PROVINCE.length > 0
        ) {
            return;
        }

        const loadAllcodes = async () => {
            setAllcodesLoading(true);
            try {
                const [position, price, payment, province] = await Promise.all([
                    apiClient.get('/allcodes', { params: { type: 'POSITION' } }),
                    apiClient.get('/allcodes', { params: { type: 'PRICE' } }),
                    apiClient.get('/allcodes', { params: { type: 'PAYMENT' } }),
                    apiClient.get('/allcodes', { params: { type: 'PROVINCE' } }),
                ]);

                setAllcodes({
                    POSITION: Array.isArray(position.data) ? position.data : [],
                    PRICE: Array.isArray(price.data) ? price.data : [],
                    PAYMENT: Array.isArray(payment.data) ? payment.data : [],
                    PROVINCE: Array.isArray(province.data) ? province.data : [],
                });
            } finally {
                setAllcodesLoading(false);
            }
        };

        loadAllcodes();
    }, [isOpen, allcodes]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        if (isEdit && doctor) {
            setFormData(mapDoctorToForm(doctor));
            setPhotoPreview(resolveImageSource(doctor.image, apiAssetBase));
        } else {
            setFormData(initialForm);
            setPhotoPreview('');
        }
        setError('');
        setSubmitting(false);
    }, [isOpen, isEdit, doctor, apiAssetBase]);

    const selectedClinic = useMemo(
        () => clinics.find((item) => String(item.id) === String(formData.clinicId)),
        [clinics, formData.clinicId]
    );

    const resetState = () => {
        setFormData(initialForm);
        setPhotoPreview('');
        setError('');
        setSubmitting(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleChange = (event) => {
        if (error) {
            setError('');
        }

        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhotoChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            setError('Please choose a valid image file.');
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            setError('Image is too large. Maximum size is 2MB.');
            return;
        }

        // Store file immediately so submit can include it even if preview loading is still in progress.
        setFormData((prev) => ({ ...prev, imageFile: file, removeImage: false }));
        setError('');

        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            setPhotoPreview(result);
        };
        reader.onerror = () => {
            setPhotoPreview('');
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = () => {
        setPhotoPreview('');
        setFormData((prev) => ({ ...prev, imageFile: null, removeImage: true }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            setError('First name and last name are required.');
            return;
        }

        if (!isEdit && (!formData.email.trim() || !formData.password.trim())) {
            setError('Email and password are required.');
            return;
        }

        if (isEdit && !doctor?.id) {
            setError('Doctor profile is invalid.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const payload = new FormData();
            payload.append('name', `${formData.firstName} ${formData.lastName}`.trim());

            if (!isEdit) {
                payload.append('email', formData.email.trim());
                payload.append('password', formData.password);
            }

            if (formData.imageFile) {
                payload.append('imageFile', formData.imageFile);
            } else if (isEdit && formData.removeImage) {
                payload.append('removeImage', '1');
            }

            if (formData.positionId) payload.append('positionId', formData.positionId);
            if (formData.gender) payload.append('gender', formData.gender);
            if (formData.phoneNumber) payload.append('phoneNumber', formData.phoneNumber);
            if (formData.priceId) payload.append('priceId', formData.priceId);
            if (formData.provinceId) payload.append('provinceId', formData.provinceId);
            if (formData.paymentId) payload.append('paymentId', formData.paymentId);
            if (selectedClinic?.address) payload.append('addressClinic', selectedClinic.address);
            if (selectedClinic?.name) payload.append('nameClinic', selectedClinic.name);
            if (formData.note) payload.append('note', formData.note);
            if (formData.clinicId) payload.append('clinicId', String(Number(formData.clinicId)));
            if (formData.specialtyId) payload.append('specialtyId', String(Number(formData.specialtyId)));

            let response;
            if (isEdit) {
                payload.append('_method', 'PATCH');
                response = await apiClient.post(`/admin/doctors/${doctor.id}`, payload, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            } else {
                response = await apiClient.post('/admin/doctors', payload, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            }

            if (isEdit) {
                onUpdated?.(response.data);
            } else {
                onCreated?.(response.data);
            }
            handleClose();
        } catch (submitError) {
            setError(buildErrorMessage(submitError, isEdit ? 'Failed to update doctor profile.' : 'Failed to create doctor account.'));
            setSubmitting(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[1px] p-4 overflow-y-auto">
            <div className="mx-auto my-8 w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-slate-200 px-8 py-6">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900">{isEdit ? 'Edit Doctor Profile' : 'Add New Doctor'}</h2>
                        <p className="text-slate-500 mt-2">{isEdit ? 'Update profile information for this doctor.' : 'Register a new medical professional to the system.'}</p>
                    </div>
                    <button onClick={handleClose} className="text-slate-400 hover:text-slate-700 transition-colors" type="button">
                        <span className="material-symbols-outlined text-3xl">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-8 px-8 py-7 max-h-[70vh] overflow-y-auto">
                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {sectionTitle('Personal Information')}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            <div className="lg:col-span-3">
                                <div className="h-28 w-28 rounded-full border-2 border-dashed border-slate-300 bg-slate-100 grid place-items-center mx-auto lg:mx-0 overflow-hidden">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Doctor preview" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-4xl text-slate-400">add_a_photo</span>
                                    )}
                                </div>
                                <label htmlFor="doctor-photo-input" className="mt-2 text-center lg:text-left text-sm font-semibold text-primary cursor-pointer block">
                                    {isEdit ? 'Change Photo' : 'Upload Photo'}
                                </label>
                                <input
                                    id="doctor-photo-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                />
                                {isEdit && photoPreview && (
                                    <button
                                        type="button"
                                        onClick={handleRemovePhoto}
                                        className="mt-2 text-xs font-semibold text-rose-600 hover:text-rose-700"
                                    >
                                        Remove current photo
                                    </button>
                                )}
                            </div>
                            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 mb-1 block">First Name *</label>
                                    <input name="firstName" value={formData.firstName} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary" placeholder="e.g. Michael" />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 mb-1 block">Last Name *</label>
                                    <input name="lastName" value={formData.lastName} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary" placeholder="e.g. Scott" />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 mb-1 block">Email Address {isEdit ? '' : '*'}</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={isEdit} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70" placeholder="doctor@hospital.com" />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 mb-1 block">Phone Number</label>
                                    <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary" placeholder="+1 (555) 000-0000" />
                                </div>
                                {!isEdit && (
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-700 mb-1 block">Temporary Password *</label>
                                        <input name="password" value={formData.password} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary" placeholder="password123" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-2 block">Gender</label>
                            <div className="flex flex-wrap gap-6 text-slate-700">
                                {[
                                    { label: 'Male', value: 'M' },
                                    { label: 'Female', value: 'F' },
                                    { label: 'Other', value: 'O' },
                                ].map((item) => (
                                    <label key={item.value} className="inline-flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="gender" value={item.value} checked={formData.gender === item.value} onChange={handleChange} className="text-primary focus:ring-primary border-slate-300" />
                                        <span>{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {sectionTitle('Professional Details')}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1 block">Specialty</label>
                                <select name="specialtyId" value={formData.specialtyId} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary">
                                    <option value="">Select specialty</option>
                                    {specialties.map((item) => (
                                        <option key={item.id} value={item.id}>{item.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1 block">Clinic / Hospital</label>
                                <select name="clinicId" value={formData.clinicId} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary">
                                    <option value="">Select clinic</option>
                                    {clinics.map((item) => (
                                        <option key={item.id} value={item.id}>{item.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1 block">Position / Title</label>
                                <select name="positionId" value={formData.positionId} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary" disabled={allcodesLoading}>
                                    <option value="">Select position</option>
                                    {allcodes.POSITION.map((item) => (
                                        <option key={item.key} value={item.key}>{getAllcodeLabel(item)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {sectionTitle('Pricing & Logistics')}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1 block">Consultation Fee ($)</label>
                                <select name="priceId" value={formData.priceId} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary" disabled={allcodesLoading}>
                                    <option value="">Select fee</option>
                                    {allcodes.PRICE.map((item) => (
                                        <option key={item.key} value={item.key}>{getAllcodeLabel(item)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1 block">Payment Method</label>
                                <select name="paymentId" value={formData.paymentId} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary" disabled={allcodesLoading}>
                                    <option value="">Select payment</option>
                                    {allcodes.PAYMENT.map((item) => (
                                        <option key={item.key} value={item.key}>{getAllcodeLabel(item)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1 block">Province / Region</label>
                                <select name="provinceId" value={formData.provinceId} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary" disabled={allcodesLoading}>
                                    <option value="">Select province</option>
                                    {allcodes.PROVINCE.map((item) => (
                                        <option key={item.key} value={item.key}>{getAllcodeLabel(item)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {sectionTitle('Doctor Bio & Notes')}
                        <div>
                            <textarea name="note" value={formData.note} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-primary min-h-28" placeholder="Enter a brief professional summary or internal notes..." />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-8 py-5 bg-slate-50 rounded-b-2xl">
                        <button type="button" onClick={handleClose} className="rounded-lg px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-100">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting} className="rounded-lg bg-primary px-6 py-2.5 font-bold text-white disabled:opacity-60">
                            {isEdit ? (submitting ? 'Saving...' : 'Save Profile') : (submitting ? 'Creating...' : 'Create Doctor Account')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewDoctorModal;
