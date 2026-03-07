<?php

namespace App\Services;

use App\Models\History;
use App\Repositories\HistoryRepository;

class HistoryService
{
    public function __construct(
        private readonly HistoryRepository $historyRepository
    ) {}

    public function create(array $payload): History
    {
        return $this->historyRepository->create($payload);
    }

    public function findByBookingId(int $bookingId): ?History
    {
        return $this->historyRepository->findByBookingId($bookingId);
    }
}
