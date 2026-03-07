<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class UserService
{
    public function __construct(
        private readonly UserRepository $userRepository
    ) {}

    public function list(): Collection
    {
        return $this->userRepository->getAll();
    }

    public function find(int $id): ?User
    {
        return $this->userRepository->findById($id);
    }

    public function create(array $payload): User
    {
        if (isset($payload['password'])) {
            $payload['password'] = Hash::make($payload['password']);
        }
        return $this->userRepository->create($payload);
    }

    public function update(int $id, array $payload): User
    {
        if (isset($payload['password'])) {
            $payload['password'] = Hash::make($payload['password']);
        }
        if (!$this->userRepository->update($id, $payload)) {
            throw new RuntimeException('User not found.');
        }

        $user = $this->find($id);
        if (!$user) {
            throw new RuntimeException('User not found.');
        }

        return $user;
    }

    public function delete(int $id): void
    {
        if (!$this->userRepository->delete($id)) {
            throw new RuntimeException('User not found.');
        }
    }
}
