<?php

namespace App\Repositories;

use App\Models\Booking;
use Illuminate\Database\Eloquent\Collection;

class BookingRepository
{
    public function getAll(): Collection
    {
        return Booking::all();
    }

    public function findById(int $id): ?Booking
    {
        return Booking::find($id);
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
        return Booking::where('patientId', $patientId)->get();
    }

    public function getByDoctorId(int $doctorId): Collection
    {
        return Booking::where('doctorId', $doctorId)->get();
    }
}
