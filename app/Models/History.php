<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class History extends Model
{
    use HasFactory;

    protected $table = 'history';

    protected $fillable = [
        'patientId',
        'doctorId',
        'bookingId',
        'description',
        'files',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patientId');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctorId');
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'bookingId');
    }
}
