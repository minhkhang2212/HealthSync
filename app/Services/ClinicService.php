<?php

namespace App\Services;

use App\Models\Clinic;
use App\Repositories\ClinicRepository;
use Illuminate\Database\Eloquent\Collection;
use RuntimeException;

class ClinicService
{
    public function __construct(
        private readonly ClinicRepository $clinicRepository
    ) {}

    public function list(): Collection
    {
        return $this->clinicRepository->getAll();
    }

    public function find(int $id): ?Clinic
    {
        return $this->clinicRepository->findById($id);
    }

    public function create(array $payload): Clinic
    {
        return $this->clinicRepository->create($payload);
    }

    public function update(int $id, array $payload): Clinic
    {
        if (!$this->clinicRepository->update($id, $payload)) {
            throw new RuntimeException('Clinic not found.');
        }

        $clinic = $this->find($id);
        if (!$clinic) {
            throw new RuntimeException('Clinic not found.');
        }

        return $clinic;
    }

    public function delete(int $id): void
    {
        if (!$this->clinicRepository->delete($id)) {
            throw new RuntimeException('Clinic not found.');
        }
    }
}
