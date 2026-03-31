export const URGENCY_META = {
    low: {
        label: 'Low',
        badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        panelClass: 'border-emerald-200 bg-emerald-50/70',
    },
    medium: {
        label: 'Medium',
        badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
        panelClass: 'border-amber-200 bg-amber-50/70',
    },
    urgent: {
        label: 'Urgent',
        badgeClass: 'border-orange-200 bg-orange-50 text-orange-700',
        panelClass: 'border-orange-200 bg-orange-50/70',
    },
    emergency: {
        label: 'Emergency',
        badgeClass: 'border-red-200 bg-red-50 text-red-700',
        panelClass: 'border-red-200 bg-red-50/70',
    },
};

export const resolveUrgencyMeta = (urgency) => URGENCY_META[urgency] || URGENCY_META.medium;
