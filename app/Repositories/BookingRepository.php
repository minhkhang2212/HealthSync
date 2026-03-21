<?php

namespace App\Repositories;

use App\Models\Booking;
use Illuminate\Database\Eloquent\Collection;

class BookingRepository
{
    private function baseQuery()
    {
        return Booking::query()->with([
            'patient:id,name,email',
            'doctor:id,name,email',
        ]);
    }

    public function getAll(): Collection
    {
        return $this->baseQuery()->get();
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
