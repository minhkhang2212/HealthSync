<?php

namespace App\Repositories;

use App\Models\History;

class HistoryRepository
{
    public function create(array $data): History
    {
        return History::create($data);
    }

    public function findByBookingId(int $bookingId): ?History
    {
        return History::where('bookingId', $bookingId)->latest('id')->first();
    }
}
