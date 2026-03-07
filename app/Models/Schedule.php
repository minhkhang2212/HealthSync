<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Schedule extends Model
{
    use HasFactory;

    protected $table = 'schedule';

    protected $fillable = [
        'doctorId',
        'date',
        'timeType',
        'maxNumber',
        'currentNumber',
    ];

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctorId');
    }
}
