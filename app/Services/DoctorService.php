<?php

namespace App\Services;

use App\DTO\DoctorDTO;
use App\Models\DoctorInfor;
use App\Models\User;
use App\Repositories\DoctorRepository;
use Illuminate\Database\Eloquent\Collection;

class DoctorService
{
    public function __construct(
        private readonly DoctorRepository $doctorRepository
    ) {}

    public function list(): Collection
    {
        return $this->doctorRepository->getAll();
    }

    public function find(int $id): ?User
    {
        return $this->doctorRepository->findById($id);
    }

    public function getDoctorInfor(int $doctorId): ?DoctorInfor
    {
        return $this->doctorRepository->getDoctorInfor($doctorId);
    }

    public function upsertDoctorInfor(DoctorDTO $dto): DoctorInfor
    {
        return $this->doctorRepository->upsertDoctorInfor(
            $dto->doctorId,
            $dto->toArray()
        );
    }

    public function syncDoctorClinicSpecialty(
        int $doctorId,
        ?int $clinicId,
        ?int $specialtyId
    ): void {
        $this->doctorRepository->syncDoctorClinicSpecialty($doctorId, $clinicId, $specialtyId);
    }
}
