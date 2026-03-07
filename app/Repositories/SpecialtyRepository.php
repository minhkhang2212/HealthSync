<?php

namespace App\Repositories;

use App\Models\Specialty;
use Illuminate\Database\Eloquent\Collection;

class SpecialtyRepository
{
    public function getAll(): Collection
    {
        return Specialty::all();
    }

    public function findById(int $id): ?Specialty
    {
        return Specialty::find($id);
    }

    public function create(array $data): Specialty
    {
        return Specialty::create($data);
    }

    public function update(int $id, array $data): bool
    {
        $specialty = $this->findById($id);
        if ($specialty) {
            return $specialty->update($data);
        }
        return false;
    }

    public function delete(int $id): bool
    {
        $specialty = $this->findById($id);
        if ($specialty) {
            return (bool) $specialty->delete();
        }
        return false;
    }
}
