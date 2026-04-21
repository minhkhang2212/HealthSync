import React from 'react';
import { Link } from 'react-router-dom';
import AdminShell from '../components/layout/AdminShell';
import apiClient from '../utils/apiClient';

const formatMinorCurrency = (amount, currency = 'gbp') => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) return '-';

    const currencyCode = String(currency || 'gbp').toUpperCase();
    const majorAmount = numericAmount / 100;

    return `${currencyCode} ${majorAmount.toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const resolveFilename = (month, headerValue) => {
    const matched = /filename="?([^"]+)"?/i.exec(headerValue || '');
    return matched?.[1] || `healthsync-revenue-${month}.pdf`;
};

const AdminRevenueReports = () => {
    const [summaryState, setSummaryState] = React.useState({
        loading: true,
        error: '',
        items: [],
        currentMonth: '',
        currency: 'gbp',
    });
    const [downloadState, setDownloadState] = React.useState({
        month: '',
        error: '',
    });

    React.useEffect(() => {
        let isMounted = true;

        const loadMonthlyRevenue = async () => {
            setSummaryState((prev) => ({
                ...prev,
                loading: true,
                error: '',
            }));

            try {
                const response = await apiClient.get('/admin/revenue/monthly');
                const payload = response.data?.data ?? response.data;
                if (!isMounted) return;

                setSummaryState({
                    loading: false,
                    error: '',
                    items: Array.isArray(payload?.items) ? payload.items : [],
                    currentMonth: payload?.currentMonth || '',
                    currency: payload?.recognizedRevenueCurrency || 'gbp',
                });
            } catch (error) {
                if (!isMounted) return;

                setSummaryState({
                    loading: false,
                    error: error.response?.data?.message || 'Failed to load monthly revenue history.',
                    items: [],
                    currentMonth: '',
                    currency: 'gbp',
                });
            }
        };

        loadMonthlyRevenue();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleDownloadPdf = async (month) => {
        setDownloadState({
            month,
            error: '',
        });

        try {
            const response = await apiClient.get(`/admin/revenue/monthly/${month}/pdf`, {
                responseType: 'blob',
            });
            const filename = resolveFilename(month, response.headers?.['content-disposition']);
            const fileBlob = response.data instanceof Blob
                ? response.data
                : new Blob([response.data], { type: 'application/pdf' });
            const objectUrl = window.URL.createObjectURL(fileBlob);
            const anchor = document.createElement('a');

            anchor.href = objectUrl;
            anchor.download = filename;
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(objectUrl);

            setDownloadState({
                month: '',
                error: '',
            });
        } catch (error) {
            setDownloadState({
                month: '',
                error: error.response?.data?.message || 'Failed to download PDF report.',
            });
        }
    };

    const currentMonthCard = summaryState.items.find((item) => item.month === summaryState.currentMonth) || summaryState.items[0] || null;

    return (
        <AdminShell searchPlaceholder="Revenue reports are not searchable yet.">
            {summaryState.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {summaryState.error}
                </div>
            )}

            {downloadState.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {downloadState.error}
                </div>
            )}

            <section className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Revenue Reports</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Review monthly recognized revenue and download a PDF snapshot for each month.
                    </p>
                </div>
                <Link
                    to="/admin/dashboard"
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
                >
                    Back to Dashboard
                </Link>
            </section>

            {currentMonthCard && (
                <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Current Revenue Snapshot</p>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight text-slate-900">{currentMonthCard.label}</h2>
                            <p className="mt-2 text-sm text-slate-500">
                                Period {currentMonthCard.periodStart} to {currentMonthCard.periodEnd}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-black text-slate-900">
                                {formatMinorCurrency(currentMonthCard.recognizedRevenueAmount, currentMonthCard.recognizedRevenueCurrency || summaryState.currency)}
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-500">
                                {currentMonthCard.paidBookingsCount} paid bookings recognized
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="space-y-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight">Monthly Revenue History</h2>
                    <p className="mt-1 text-sm text-slate-500">Select a month below to export the report as PDF.</p>
                </div>

                {summaryState.loading ? (
                    <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center text-slate-500">
                        Loading monthly revenue history...
                    </div>
                ) : summaryState.items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-400">
                        No monthly revenue has been recognized yet.
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {summaryState.items.map((item) => {
                            const isCurrentMonth = item.month === summaryState.currentMonth;
                            const isDownloading = downloadState.month === item.month;

                            return (
                                <article
                                    key={item.month}
                                    className={`rounded-2xl border p-5 shadow-sm transition-colors ${isCurrentMonth ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-lg font-black text-slate-900">{item.label}</p>
                                            <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{item.month}</p>
                                        </div>
                                        {isCurrentMonth && (
                                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">
                                                Current
                                            </span>
                                        )}
                                    </div>

                                    <p className="mt-6 text-3xl font-black text-slate-900">
                                        {formatMinorCurrency(item.recognizedRevenueAmount, item.recognizedRevenueCurrency || summaryState.currency)}
                                    </p>
                                    <p className="mt-2 text-sm text-slate-500">
                                        {item.paidBookingsCount} paid bookings recognized
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Period {item.periodStart} to {item.periodEnd}
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => handleDownloadPdf(item.month)}
                                        disabled={isDownloading}
                                        aria-label={`Download PDF for ${item.label}`}
                                        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                                    >
                                        {isDownloading ? 'Downloading PDF...' : 'Download PDF'}
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </AdminShell>
    );
};

export default AdminRevenueReports;
