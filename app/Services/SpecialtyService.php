<?php

namespace App\Services;

use App\Models\Specialty;
use App\Repositories\SpecialtyRepository;
use Illuminate\Database\Eloquent\Collection;
use RuntimeException;

class SpecialtyService
{
    public function __construct(
        private readonly SpecialtyRepository $specialtyRepository
    ) {}

    public function list(): Collection
    {
        return $this->specialtyRepository->getAll();
    }

    public function find(int $id): ?Specialty
    {
        return $this->specialtyRepository->findById($id);
    }

    public function create(array $payload): Specialty
    {
        return $this->specialtyRepository->create($payload);
    }

    public function update(int $id, array $payload): Specialty
    {
        if (!$this->specialtyRepository->update($id, $payload)) {
            throw new RuntimeException('Specialty not found.');
        }

        $specialty = $this->find($id);
        if (!$specialty) {
            throw new RuntimeException('Specialty not found.');
        }

        return $specialty;
    }

    public function delete(int $id): void
    {
        if (!$this->specialtyRepository->delete($id)) {
            throw new RuntimeException('Specialty not found.');
        }
    }
}
