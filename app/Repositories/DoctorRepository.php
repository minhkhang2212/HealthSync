<?php

namespace App\Repositories;

use App\Models\DoctorInfor;
use App\Models\DoctorClinicSpecialty;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class DoctorRepository
{
    public function getAll(): Collection
    {
        return User::where('roleId', 'R2')
            ->with(['doctorInfor', 'doctorClinicSpecialties'])
            ->get();
    }

    public function findById(int $id): ?User
    {
        return User::where('roleId', 'R2')
            ->with(['doctorInfor', 'doctorClinicSpecialties'])
            ->find($id);
    }

    public function getDoctorInfor(int $doctorId): ?DoctorInfor
    {
        return DoctorInfor::where('doctorId', $doctorId)->first();
    }

    public function upsertDoctorInfor(int $doctorId, array $data): DoctorInfor
    {
        return DoctorInfor::updateOrCreate(
            ['doctorId' => $doctorId],
            $data
        );
    }

    public function syncDoctorClinicSpecialty(
        int $doctorId,
        ?int $clinicId,
        ?int $specialtyId
    ): ?DoctorClinicSpecialty {
        if (!$clinicId || !$specialtyId) {
            return null;
        }

        DoctorClinicSpecialty::where('doctorId', $doctorId)->delete();

        return DoctorClinicSpecialty::create([
            'doctorId' => $doctorId,
            'clinicId' => $clinicId,
            'specialtyId' => $specialtyId,
        ]);
    }
}
