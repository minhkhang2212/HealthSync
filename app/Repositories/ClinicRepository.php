<?php

namespace App\Repositories;

use App\Models\Clinic;
use Illuminate\Database\Eloquent\Collection;

class ClinicRepository
{
    public function getAll(): Collection
    {
        return Clinic::all();
    }

    public function findById(int $id): ?Clinic
    {
        return Clinic::find($id);
    }

    public function create(array $data): Clinic
    {
        return Clinic::create($data);
    }

    public function update(int $id, array $data): bool
    {
        $clinic = $this->findById($id);
        if ($clinic) {
            return $clinic->update($data);
        }
        return false;
    }

    public function delete(int $id): bool
    {
        $clinic = $this->findById($id);
        if ($clinic) {
            return (bool) $clinic->delete();
        }
        return false;
    }
}
