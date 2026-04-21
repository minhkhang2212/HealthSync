<?php

namespace App\Repositories;

use App\Models\Booking;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;

class BookingRepository
{
    private function baseQuery()
    {
        return Booking::query()->with([
            'patient:id,name,email',
            'doctor:id,name,email',
        ]);
    }

    private function recognizedRevenueQuery()
    {
        return $this->baseQuery()
            ->where('paymentStatus', 'paid')
            ->whereNotNull('paymentAmount')
            ->whereNotNull('paidAt');
    }

    public function getAll(): Collection
    {
        return $this->baseQuery()->get();
    }

    public function getAdminFeed(): Collection
    {
        return $this->baseQuery()
            ->orderByDesc('date')
            ->orderByDesc('timeType')
            ->get();
    }

    public function sumRecognizedRevenueBetween(CarbonInterface $start, CarbonInterface $end): int
    {
        return (int) Booking::query()
            ->where('paymentStatus', 'paid')
            ->whereNotNull('paymentAmount')
            ->whereBetween('paidAt', [$start, $end])
            ->sum('paymentAmount');
    }

    public function getRecognizedRevenueEntriesBetween(CarbonInterface $start, CarbonInterface $end): Collection
    {
        return $this->recognizedRevenueQuery()
            ->whereBetween('paidAt', [$start, $end])
            ->orderBy('paidAt')
            ->orderBy('id')
            ->get();
    }

    public function getRecognizedRevenueMonthlySummary(CarbonInterface $referenceDate): SupportCollection
    {
        $timezone = 'Europe/London';
        $entries = $this->recognizedRevenueQuery()
            ->orderByDesc('paidAt')
            ->orderByDesc('id')
            ->get();

        $currentMonth = $referenceDate->copy()->timezone($timezone)->startOfMonth();
        $firstPaidAt = $entries
            ->last()?->paidAt
            ?->copy()
            ->timezone($timezone)
            ->startOfMonth();

        $startMonth = $firstPaidAt ?: $currentMonth->copy();
        $groupedEntries = $entries->groupBy(
            fn (Booking $booking) => $booking->paidAt->copy()->timezone($timezone)->format('Y-m')
        );

        $months = collect();
        for ($cursor = $currentMonth->copy(); $cursor->greaterThanOrEqualTo($startMonth); $cursor->subMonthNoOverflow()) {
            $monthKey = $cursor->format('Y-m');
            $monthEntries = $groupedEntries->get($monthKey, collect());

            $months->push([
                'month' => $monthKey,
                'label' => $cursor->format('F Y'),
                'periodStart' => $cursor->copy()->startOfMonth()->toDateString(),
                'periodEnd' => $cursor->copy()->endOfMonth()->toDateString(),
                'recognizedRevenueAmount' => (int) $monthEntries->sum('paymentAmount'),
                'recognizedRevenueCurrency' => 'gbp',
                'paidBookingsCount' => $monthEntries->count(),
            ]);
        }

        return $months;
    }

    public function findById(int $id): ?Booking
    {
        return $this->baseQuery()->find($id);
    }

    public function findByIdForUpdate(int $id): ?Booking
    {
        return Booking::query()
            ->whereKey($id)
            ->lockForUpdate()
            ->first();
    }

    public function findByStripeCheckoutSessionId(string $sessionId): ?Booking
    {
        return $this->baseQuery()
            ->where('stripeCheckoutSessionId', $sessionId)
            ->first();
    }

    public function findByStripeCheckoutSessionIdForUpdate(string $sessionId): ?Booking
    {
        return Booking::query()
            ->where('stripeCheckoutSessionId', $sessionId)
            ->lockForUpdate()
            ->first();
    }

    public function create(array $data): Booking
    {
        return Booking::create($data);
    }

    public function update(int $id, array $data): bool
    {
        $booking = $this->findById($id);
        if ($booking) {
            return $booking->update($data);
        }
        return false;
    }

    public function delete(int $id): bool
    {
        $booking = $this->findById($id);
        if ($booking) {
            return (bool) $booking->delete();
        }
        return false;
    }

    public function getByPatientId(int $patientId): Collection
    {
        return $this->baseQuery()
            ->where('patientId', $patientId)
            ->orderByDesc('date')
            ->orderByDesc('timeType')
            ->get();
    }

    public function getByDoctorId(int $doctorId, ?string $date = null): Collection
    {
        $query = $this->baseQuery()
            ->where('doctorId', $doctorId);

        if ($date) {
            $query->whereDate('date', $date);
        }

        return $query
            ->orderBy('date')
            ->orderBy('timeType')
            ->get();
    }
}
