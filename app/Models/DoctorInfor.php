<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DoctorInfor extends Model
{
    use HasFactory;

    protected $table = 'doctor_infor';

    protected $fillable = [
        'doctorId',
        'priceId',
        'provinceId',
        'paymentId',
        'addressClinic',
        'nameClinic',
        'note',
        'count',
    ];

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctorId');
    }

    public function markdowns(): HasMany
    {
        return $this->hasMany(Markdown::class, 'doctorId', 'doctorId');
    }
}
