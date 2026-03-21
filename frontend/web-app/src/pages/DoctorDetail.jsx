import React from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { cancelBooking as cancelPatientBooking, clearError as clearBookingError, createBooking } from '../store/slices/bookingSlice';
import BookingRequestModal from '../components/booking/BookingRequestModal';
import { fetchDoctorAvailability, fetchDoctorById } from '../store/slices/doctorSlice';
import apiClient, { getApiAssetBase } from '../utils/apiClient';
import { readAllcodeCache, writeAllcodeCache } from '../utils/allcodeCache';
import { compareTimeType, DEFAULT_TIME_LABELS } from '../utils/timeSlots';

const POSITION_LABELS = {
    P0: 'Doctor',
    P1: 'Master',
    P2: 'PhD',
    P3: 'Associate Professor',
    P4: 'Professor',
};

const DEFAULT_BOOKING_FORM = {
    bookingFor: 'self',
    patientName: '',
    patientGender: 'M',
    patientPhoneNumber: '',
    patientContactEmail: '',
    patientBirthYear: '',
    patientProvince: '',
    patientDistrict: '',
    patientAddress: '',
    reasonForVisit: '',
    paymentMethod: 'pay_at_clinic',
};

const normalizeSearchText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

const resolveImageSource = (value, apiAssetBase) => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim().replace(/\\/g, '/');
    if (!trimmed) return null;
    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/')) return apiAssetBase ? `${apiAssetBase}${trimmed}` : trimmed;

    const isStorageLikePath =
        trimmed.startsWith('storage/') ||
        trimmed.startsWith('public/') ||
        trimmed.startsWith('uploads/') ||
        trimmed.startsWith('doctors/') ||
        trimmed.startsWith('clinics/') ||
        trimmed.startsWith('specialties/');

    const hasImageExtension = /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?.*)?$/i.test(trimmed);
    if (isStorageLikePath || hasImageExtension) {
        if (trimmed.startsWith('storage/')) return apiAssetBase ? `${apiAssetBase}/${trimmed}` : `/${trimmed}`;
        if (trimmed.startsWith('public/storage/')) {
            const publicStoragePath = trimmed.replace(/^public/, '');
            return apiAssetBase ? `${apiAssetBase}${publicStoragePath}` : publicStoragePath;
        }
        const normalizedPath = trimmed.startsWith('public/') ? trimmed.replace(/^public\//, '') : trimmed;
        const storagePath = `/storage/${normalizedPath}`;
        return apiAssetBase ? `${apiAssetBase}${storagePath}` : storagePath;
    }

    return `data:image/jpeg;base64,${trimmed}`;
};

const loadAllcodeMap = async (type) => {
    const cached = readAllcodeCache(type);
    const response = cached
        ? { data: cached }
        : await apiClient.get('/allcodes', { params: { type } });

    if (!cached && Array.isArray(response.data)) {
        writeAllcodeCache(type, response.data);
    }

    return Object.fromEntries((response.data || []).map((item) => [item.key, item.valueEn]));
};

const formatPrice = (value) => {
    const label = String(value || '').trim();
    const matched = label.match(/^(\d+)\s*GBP$/i);
    if (matched) {
        return `GBP ${matched[1]}`;
    }
    return label || 'Pay at clinic';
};

const formatBookingDateLabel = (date) => {
    if (!date) return 'Choose a date';
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime())
        ? date
        : parsed.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
};

const extractInitials = (name) =>
    String(name || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'DR';

const resolveSpecialtyIcon = (specialtyName) => {
    const searchText = normalizeSearchText(specialtyName);
    if (searchText.includes('cardio') || searchText.includes('heart')) return 'favorite';
    if (searchText.includes('derma') || searchText.includes('skin')) return 'dermatology';
    if (searchText.includes('neuro') || searchText.includes('brain')) return 'neurology';
    if (searchText.includes('pedia') || searchText.includes('child')) return 'child_care';
    if (searchText.includes('dental') || searchText.includes('tooth')) return 'dentistry';
    if (searchText.includes('eye') || searchText.includes('vision') || searchText.includes('ophthal')) return 'visibility';
    if (searchText.includes('ortho') || searchText.includes('bone') || searchText.includes('joint')) return 'accessibility_new';
    if (searchText.includes('ent') || searchText.includes('ear') || searchText.includes('nose') || searchText.includes('throat')) return 'hearing';
    return 'medical_services';
};

const getPaymentAvailability = (paymentId) => ({
    pay_at_clinic: paymentId !== 'PAY2',
    stripe: paymentId !== 'PAY1',
});

const resolvePreferredPaymentMethod = (availability) => {
    if (availability.pay_at_clinic) return 'pay_at_clinic';
    if (availability.stripe) return 'stripe';
    return 'pay_at_clinic';
};

const validateBookingForm = (formData, paymentAvailability) => {
    const errors = {};
    const currentYear = new Date().getFullYear();
    const birthYear = Number.parseInt(formData.patientBirthYear, 10);

    if (!formData.patientName.trim()) errors.patientName = 'Please enter the patient full name.';
    if (!formData.patientGender) errors.patientGender = 'Please choose the patient gender.';
    if (!formData.patientPhoneNumber.trim()) errors.patientPhoneNumber = 'Please enter a contact phone number.';
    if (!formData.patientContactEmail.trim()) {
        errors.patientContactEmail = 'Please enter a contact email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.patientContactEmail.trim())) {
        errors.patientContactEmail = 'Please enter a valid email address.';
    }
    if (!formData.patientBirthYear) {
        errors.patientBirthYear = 'Please enter the birth year.';
    } else if (Number.isNaN(birthYear) || birthYear < 1900 || birthYear > currentYear) {
        errors.patientBirthYear = 'Please enter a valid birth year.';
    }
    if (!formData.patientProvince.trim()) errors.patientProvince = 'Please enter the city or region.';
    if (!formData.patientDistrict.trim()) errors.patientDistrict = 'Please enter the district or area.';
    if (!formData.patientAddress.trim()) errors.patientAddress = 'Please enter the street address.';
    if (!formData.reasonForVisit.trim()) errors.reasonForVisit = 'Please tell the clinic why you need the visit.';
    if (!paymentAvailability[formData.paymentMethod]) {
        errors.paymentMethod = 'The selected payment method is not available for this clinic.';
    }

    return errors;
};

const DoctorDetail = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { selectedDoctor, availability, loading, error } = useSelector((state) => state.doctor);
    const { loading: bookingLoading, error: bookingError } = useSelector((state) => state.booking);

    const [selectedDate, setSelectedDate] = React.useState('');
    const [selectedTime, setSelectedTime] = React.useState('');
    const [timeLabels, setTimeLabels] = React.useState(DEFAULT_TIME_LABELS);
    const [priceLabels, setPriceLabels] = React.useState({});
    const [paymentLabels, setPaymentLabels] = React.useState({});
    const [successMessage, setSuccessMessage] = React.useState('');
    const [isBookingModalOpen, setIsBookingModalOpen] = React.useState(false);
    const [fieldErrors, setFieldErrors] = React.useState({});
    const [bookingForm, setBookingForm] = React.useState(DEFAULT_BOOKING_FORM);
    const handledCheckoutEventRef = React.useRef('');

    const apiAssetBase = React.useMemo(() => getApiAssetBase(), []);

    React.useEffect(() => {
        if (!id) return;

        dispatch(clearBookingError());
        dispatch(fetchDoctorById(id));
        dispatch(fetchDoctorAvailability({ id }));
    }, [dispatch, id]);

    React.useEffect(() => {
        let cancelled = false;

        const loadAllcodes = async () => {
            try {
                const [timeMap, priceMap, paymentMap] = await Promise.all([
                    loadAllcodeMap('TIME'),
                    loadAllcodeMap('PRICE'),
                    loadAllcodeMap('PAYMENT'),
                ]);

                if (cancelled) return;
                setTimeLabels({ ...DEFAULT_TIME_LABELS, ...timeMap });
                setPriceLabels(priceMap);
                setPaymentLabels(paymentMap);
            } catch {
                if (cancelled) return;
                setTimeLabels(DEFAULT_TIME_LABELS);
                setPriceLabels({});
                setPaymentLabels({});
            }
        };

        loadAllcodes();

        return () => {
            cancelled = true;
        };
    }, []);

    React.useEffect(() => {
        setBookingForm((previous) => {
            const next = { ...previous };
            let hasChanged = false;

            if (!previous.patientName && user?.name) {
                next.patientName = user.name;
                hasChanged = true;
            }
            if (!previous.patientContactEmail && user?.email) {
                next.patientContactEmail = user.email;
                hasChanged = true;
            }
            if (!previous.patientPhoneNumber && user?.phoneNumber) {
                next.patientPhoneNumber = user.phoneNumber;
                hasChanged = true;
            }
            if (user?.gender && previous.patientGender !== user.gender) {
                next.patientGender = user.gender;
                hasChanged = true;
            }

            return hasChanged ? next : previous;
        });
    }, [user?.email, user?.gender, user?.name, user?.phoneNumber]);

    React.useEffect(() => {
        if (availability.length === 0) {
            setSelectedDate('');
            setSelectedTime('');
            return;
        }

        const dates = [...new Set(availability.map((slot) => slot.date))];
        const firstAvailableDate = dates[0] || '';

        setSelectedDate((previous) => (dates.includes(previous) ? previous : firstAvailableDate));
        setSelectedTime((previous) => {
            if (!previous) return '';
            const activeDate = dates.includes(selectedDate) ? selectedDate : firstAvailableDate;
            const exists = availability.some((slot) => slot.date === activeDate && slot.timeType === previous);
            return exists ? previous : '';
        });
    }, [availability, selectedDate]);

    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const checkoutState = params.get('checkout');
        const bookingId = Number.parseInt(params.get('booking') || '', 10);

        if (!checkoutState || Number.isNaN(bookingId) || !id) {
            return undefined;
        }

        const eventKey = `${checkoutState}:${bookingId}`;
        if (handledCheckoutEventRef.current === eventKey) {
            return undefined;
        }

        handledCheckoutEventRef.current = eventKey;

        let isCancelled = false;
        let redirectTimer;
        const clearQuery = () => {
            if (!isCancelled) {
                navigate(location.pathname, { replace: true });
            }
        };

        if (checkoutState === 'cancelled') {
            dispatch(cancelPatientBooking(bookingId)).finally(() => {
                if (isCancelled) return;
                setSuccessMessage('Online payment was cancelled. The reservation has been released.');
                dispatch(fetchDoctorAvailability({ id }));
                clearQuery();
            });
        }

        if (checkoutState === 'success') {
            setSuccessMessage('Payment completed successfully. Redirecting to your dashboard...');
            dispatch(fetchDoctorAvailability({ id }));
            clearQuery();
            redirectTimer = window.setTimeout(() => {
                if (!isCancelled) {
                    navigate('/patient');
                }
            }, 1200);
        }

        return () => {
            isCancelled = true;
            if (redirectTimer) window.clearTimeout(redirectTimer);
        };
    }, [dispatch, id, location.pathname, location.search, navigate]);

    const availableDates = React.useMemo(
        () => [...new Set(availability.map((slot) => slot.date))],
        [availability]
    );

    const bookingDateMin = availableDates[0] || '';
    const bookingDateMax = availableDates[availableDates.length - 1] || '';

    const selectedDateSlots = React.useMemo(
        () => availability
            .filter((slot) => slot.date === selectedDate && slot.currentNumber < 1 && slot.isActive !== false)
            .sort((a, b) => compareTimeType(a.timeType, b.timeType)),
        [availability, selectedDate]
    );

    const mapping = selectedDoctor?.doctor_clinic_specialties?.[0];
    const doctorInfor = selectedDoctor?.doctor_infor || {};
    const doctorMarkdown = doctorInfor?.markdowns?.[0] || null;
    const clinic = mapping?.clinic || null;
    const specialty = mapping?.specialty || null;
    const clinicName = clinic?.name || doctorInfor?.nameClinic || 'Clinic updating';
    const clinicAddress = clinic?.address || doctorInfor?.addressClinic || 'Clinic address updating';
    const specialtyName = specialty?.name || 'Specialty updating';
    const specialtyId = specialty?.id;
    const doctorImage = resolveImageSource(selectedDoctor?.image, apiAssetBase);
    const clinicImage = resolveImageSource(clinic?.image, apiAssetBase);
    const specialtyIcon = resolveSpecialtyIcon(specialtyName);
    const positionLabel = POSITION_LABELS[selectedDoctor?.positionId] || 'Doctor';
    const consultationFee = formatPrice(priceLabels[doctorInfor?.priceId] || '');
    const paymentLabel = paymentLabels[doctorInfor?.paymentId] || 'Pay at clinic';
    const clinicDirectionsUrl = clinicAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinicAddress)}`
        : null;
    const paymentAvailability = React.useMemo(
        () => getPaymentAvailability(doctorInfor?.paymentId),
        [doctorInfor?.paymentId]
    );
    const selectedDateLabel = formatBookingDateLabel(selectedDate);
    const selectedTimeLabel = selectedTime ? (timeLabels[selectedTime] || selectedTime) : 'Choose a time slot';
    const paymentCardCopy = React.useMemo(() => {
        if (paymentAvailability.pay_at_clinic && paymentAvailability.stripe) {
            return {
                title: 'Choose Payment Later',
                body: 'Choose Pay at Clinic or secure online payment in the next step.',
            };
        }

        if (paymentAvailability.pay_at_clinic) {
            return {
                title: 'Pay at Clinic',
                body: 'No payment is required now. You will pay during your visit.',
            };
        }

        return {
            title: 'Pay Online',
            body: 'Payment will be collected securely in the next step by card or Apple Pay when available.',
        };
    }, [paymentAvailability.pay_at_clinic, paymentAvailability.stripe]);

    React.useEffect(() => {
        setBookingForm((previous) => {
            if (paymentAvailability[previous.paymentMethod]) {
                return previous;
            }

            return {
                ...previous,
                paymentMethod: resolvePreferredPaymentMethod(paymentAvailability),
            };
        });
    }, [paymentAvailability]);

    const openBookingModal = () => {
        dispatch(clearBookingError());
        setFieldErrors({});
        setIsBookingModalOpen(true);
        setBookingForm((previous) => ({
            ...previous,
            patientContactEmail: previous.patientContactEmail || user?.email || '',
            patientName: previous.patientName || user?.name || '',
            patientPhoneNumber: previous.patientPhoneNumber || user?.phoneNumber || '',
            patientGender: user?.gender || previous.patientGender || 'M',
            paymentMethod: paymentAvailability[previous.paymentMethod]
                ? previous.paymentMethod
                : resolvePreferredPaymentMethod(paymentAvailability),
        }));
    };

    const closeBookingModal = () => {
        setIsBookingModalOpen(false);
        setFieldErrors({});
        dispatch(clearBookingError());
    };

    const handleBookingFieldChange = (field, value) => {
        setBookingForm((previous) => {
            const next = { ...previous, [field]: value };

            if (field === 'bookingFor' && value === 'self') {
                next.patientName = user?.name || next.patientName;
                next.patientContactEmail = user?.email || next.patientContactEmail;
                next.patientPhoneNumber = user?.phoneNumber || next.patientPhoneNumber;
                next.patientGender = user?.gender || next.patientGender;
            }

            return next;
        });

        setFieldErrors((previous) => {
            if (!previous[field] && field !== 'paymentMethod') {
                return previous;
            }

            const next = { ...previous };
            delete next[field];
            return next;
        });

        dispatch(clearBookingError());
    };

    const handleSubmitBooking = async () => {
        const validationErrors = validateBookingForm(bookingForm, paymentAvailability);
        if (Object.keys(validationErrors).length > 0) {
            setFieldErrors(validationErrors);
            return;
        }

        const result = await dispatch(
            createBooking({
                doctorId: Number(id),
                date: selectedDate,
                timeType: selectedTime,
                bookingFor: bookingForm.bookingFor,
                patientName: bookingForm.patientName.trim(),
                patientGender: bookingForm.patientGender,
                patientPhoneNumber: bookingForm.patientPhoneNumber.trim(),
                patientContactEmail: bookingForm.patientContactEmail.trim(),
                patientBirthYear: Number.parseInt(bookingForm.patientBirthYear, 10),
                patientProvince: bookingForm.patientProvince.trim(),
                patientDistrict: bookingForm.patientDistrict.trim(),
                patientAddress: bookingForm.patientAddress.trim(),
                reasonForVisit: bookingForm.reasonForVisit.trim(),
                paymentMethod: bookingForm.paymentMethod,
            })
        );

        if (!createBooking.fulfilled.match(result)) {
            return;
        }

        const response = result.payload || {};
        const redirectUrl = response?.redirectUrl;

        if (typeof redirectUrl === 'string' && redirectUrl) {
            setSuccessMessage('Redirecting you to secure payment...');
            closeBookingModal();
            window.location.assign(redirectUrl);
            return;
        }

        closeBookingModal();
        setSuccessMessage('Booking created successfully. Redirecting to your dashboard...');
        setSelectedTime('');
        dispatch(fetchDoctorAvailability({ id }));
        window.setTimeout(() => navigate('/patient'), 900);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-8">
                <div className="mx-auto max-w-6xl rounded-[28px] border border-slate-200 bg-white p-8 text-center text-slate-500">
                    Loading doctor profile...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-8">
                <div className="mx-auto max-w-6xl rounded-[28px] border border-red-200 bg-white p-8 text-center text-red-700">
                    {error}
                </div>
            </div>
        );
    }

    if (!selectedDoctor) {
        return (
            <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-8">
                <div className="mx-auto max-w-6xl rounded-[28px] border border-slate-200 bg-white p-8 text-center text-slate-500">
                    Doctor not found.
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-slate-100 text-slate-900">
                <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
                    <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8 lg:px-10">
                        <Link to="/patient" className="flex items-center gap-3">
                            <div className="grid size-10 place-items-center rounded-xl bg-primary text-white shadow-lg shadow-blue-200/70">
                                <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
                            </div>
                            <div>
                                <p className="text-lg font-black tracking-tight">HealthSync</p>
                                <p className="text-xs text-slate-500">Patient Portal</p>
                            </div>
                        </Link>

                        <div className="flex items-center gap-3">
                            <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 sm:flex">
                                <div className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-black text-white">
                                    {extractInitials(user?.name)}
                                </div>
                                <span className="max-w-[180px] truncate text-sm font-semibold text-slate-700">{user?.name}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/patient')}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
                    <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <Link to="/patient" className="font-medium hover:text-primary">Home</Link>
                        <span className="material-symbols-outlined text-base text-slate-300">chevron_right</span>
                        {specialtyId ? (
                            <Link to={`/patient/specialties/${specialtyId}`} className="font-medium hover:text-primary">
                                {specialtyName}
                            </Link>
                        ) : (
                            <span>{specialtyName}</span>
                        )}
                        <span className="material-symbols-outlined text-base text-slate-300">chevron_right</span>
                        <span className="font-semibold text-slate-900">{selectedDoctor.name}</span>
                    </nav>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                        <div className="space-y-8 lg:col-span-2">
                            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                                <div className="bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_38%),linear-gradient(135deg,_#ffffff,_#eff6ff)] px-6 py-8 md:px-8">
                                    <div className="flex flex-col gap-6 md:flex-row md:items-center">
                                        <div className="size-32 overflow-hidden rounded-[24px] border border-white/80 bg-slate-100 shadow-lg md:size-40">
                                            {doctorImage ? (
                                                <img src={doctorImage} alt={selectedDoctor.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="grid h-full w-full place-items-center bg-slate-900 text-2xl font-black text-white">
                                                    {extractInitials(selectedDoctor.name)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <div className="space-y-3">
                                                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-primary shadow-sm">
                                                    <span className="material-symbols-outlined text-[16px]">{specialtyIcon}</span>
                                                    {specialtyName}
                                                </div>
                                                <div>
                                                    <h1 className="text-3xl font-black tracking-tight text-slate-900">{selectedDoctor.name}</h1>
                                                    <p className="mt-2 text-base font-semibold text-primary">{positionLabel}</p>
                                                </div>
                                            </div>

                                            <div className="mt-6 space-y-3 text-slate-600">
                                                <div className="flex items-start gap-3">
                                                    <span className="material-symbols-outlined mt-0.5 text-[20px] text-slate-500">apartment</span>
                                                    <div>
                                                        <p className="text-[15px] font-semibold text-slate-900">{clinicName}</p>
                                                        <p className="mt-1 text-sm text-slate-500">{clinicAddress}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3">
                                                    <span className="material-symbols-outlined mt-0.5 text-[20px] text-slate-500">mail</span>
                                                    <div className="text-sm text-slate-500">
                                                        <p className="font-semibold text-slate-700">{selectedDoctor.email}</p>
                                                        <p className="mt-1">{selectedDoctor.phoneNumber || 'Phone number updating'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-primary">
                                        <span className="material-symbols-outlined">person</span>
                                    </div>
                                    <div>
                                        <h2 className="text-[26px] font-black tracking-tight text-slate-900">About {selectedDoctor.name}</h2>
                                        <p className="text-sm text-slate-500">{doctorMarkdown?.description || doctorInfor?.note || 'Doctor profile summary'}</p>
                                    </div>
                                </div>

                                {doctorMarkdown?.contentHTML ? (
                                    <div
                                        className="text-[15px] leading-7 text-slate-600 [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-black [&_h3]:text-slate-900 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5"
                                        dangerouslySetInnerHTML={{ __html: doctorMarkdown.contentHTML }}
                                    />
                                ) : (
                                    <p className="text-[15px] leading-7 text-slate-600">
                                        {doctorInfor?.note || 'Detailed doctor profile is being updated.'}
                                    </p>
                                )}
                            </section>

                            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-primary">
                                        <span className="material-symbols-outlined">location_on</span>
                                    </div>
                                    <div>
                                        <h2 className="text-[26px] font-black tracking-tight text-slate-900">Clinic Location</h2>
                                        <p className="text-sm text-slate-500">Where your appointment will take place</p>
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[28px] font-black leading-tight text-slate-900">{clinicName}</p>
                                            <p className="mt-2 text-[15px] leading-7 text-slate-600">{clinicAddress}</p>
                                        </div>

                                        {clinic?.description && (
                                            <p className="rounded-2xl bg-slate-50 px-4 py-4 text-[15px] leading-7 text-slate-600">
                                                {clinic.description}
                                            </p>
                                        )}

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Consultation Fee</p>
                                                <p className="mt-2 text-lg font-black text-slate-900">{consultationFee}</p>
                                            </div>
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Clinic Payment Setup</p>
                                                <p className="mt-2 text-lg font-black text-slate-900">{paymentLabel}</p>
                                            </div>
                                        </div>

                                        {clinicDirectionsUrl && (
                                            <a
                                                href={clinicDirectionsUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 text-sm font-black text-primary hover:underline"
                                            >
                                                Get Directions
                                                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                            </a>
                                        )}
                                    </div>

                                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
                                        {clinicImage ? (
                                            <img src={clinicImage} alt={clinicName} className="h-full min-h-[260px] w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full min-h-[260px] w-full items-center justify-center bg-[linear-gradient(135deg,_#dbeafe,_#eff6ff_55%,_#f8fafc)]">
                                                <div className="text-center">
                                                    <span className="material-symbols-outlined text-6xl text-primary/60">apartment</span>
                                                    <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Clinic Preview</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>

                        <aside className="lg:col-span-1">
                            <div className="sticky top-24 space-y-4">
                                <section className="rounded-[28px] border-2 border-primary/10 bg-white p-6 shadow-xl shadow-blue-100/50">
                                    <h2 className="text-[26px] font-black tracking-tight text-slate-900">Book Appointment</h2>
                                    <p className="mt-2 text-sm text-slate-500">
                                        Select a date and time first. The patient details form will open in a booking modal.
                                    </p>

                                    <div className="mt-5 space-y-3">
                                        {successMessage && (
                                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                                {successMessage}
                                            </div>
                                        )}
                                        {!isBookingModalOpen && bookingError && (
                                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                                {bookingError}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6">
                                        <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Select Date</p>
                                        {availableDates.length > 0 ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="date"
                                                    value={selectedDate}
                                                    min={bookingDateMin}
                                                    max={bookingDateMax}
                                                    onChange={(event) => {
                                                        setSelectedDate(event.target.value);
                                                        setSelectedTime('');
                                                    }}
                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100"
                                                />
                                                <p className="text-xs text-slate-500">
                                                    Pick a day from the calendar. Only dates with open slots will show available times below.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                                                No appointment dates are available right now.
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6">
                                        <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Available Slots</p>
                                        {selectedDateSlots.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {selectedDateSlots.map((slot) => {
                                                    const isSelected = selectedTime === slot.timeType;
                                                    return (
                                                        <button
                                                            key={slot.id || `${slot.date}-${slot.timeType}`}
                                                            type="button"
                                                            onClick={() => setSelectedTime(slot.timeType)}
                                                            className={`rounded-2xl border px-3 py-3 text-[13px] font-bold whitespace-nowrap transition sm:text-sm ${
                                                                isSelected
                                                                    ? 'border-primary bg-primary text-white shadow-md shadow-blue-200'
                                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary'
                                                            }`}
                                                        >
                                                            {timeLabels[slot.timeType] || slot.timeType}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                                                {selectedDate ? 'No slots remain on this date.' : 'Choose a date to view time slots.'}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
                                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
                                            <span className="text-[15px] font-medium leading-none text-slate-500">Consultation Fee</span>
                                            <span className="text-[24px] font-black leading-none tracking-tight text-slate-900">{consultationFee}</span>
                                        </div>

                                        <div className="rounded-[24px] bg-[#eef5ff] px-5 py-5">
                                            <div className="flex items-start gap-4">
                                                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-white shadow-sm">
                                                    <span className="material-symbols-outlined text-[18px]">info</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[15px] font-black leading-6 text-slate-900">{paymentCardCopy.title}</p>
                                                    <p className="mt-1 text-[15px] leading-8 text-slate-600">{paymentCardCopy.body}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={openBookingModal}
                                            disabled={!selectedDate || !selectedTime || bookingLoading}
                                            className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-primary px-4 py-3 text-base font-black text-white shadow-[0_16px_30px_-18px_rgba(37,99,235,0.9)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Confirm Booking
                                            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                                        </button>
                                    </div>
                                </section>
                            </div>
                        </aside>
                    </div>
                </main>
            </div>

            <BookingRequestModal
                open={isBookingModalOpen}
                onClose={closeBookingModal}
                onSubmit={handleSubmitBooking}
                onChange={handleBookingFieldChange}
                onSelectPaymentMethod={(value) => handleBookingFieldChange('paymentMethod', value)}
                formData={bookingForm}
                fieldErrors={fieldErrors}
                submissionError={bookingError}
                submitting={bookingLoading}
                doctorName={selectedDoctor.name}
                clinicName={clinicName}
                consultationFee={consultationFee}
                selectedDateLabel={selectedDateLabel}
                selectedTimeLabel={selectedTimeLabel}
                paymentAvailability={paymentAvailability}
            />
        </>
    );
};

export default DoctorDetail;
