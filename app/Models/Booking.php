<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Booking extends Model
{
    use HasFactory;

    protected $table = 'booking';

    protected $fillable = [
        'patientId',
        'doctorId',
        'patientContactEmail',
        'date',
        'timeType',
        'statusId',
        'confirmedAt',
        'confirmationAttachment',
        'prescriptionSentAt',
        'prescriptionAttachment',
    ];

    protected $casts = [
        'confirmedAt' => 'datetime',
        'prescriptionSentAt' => 'datetime',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patientId');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctorId');
    }
}
