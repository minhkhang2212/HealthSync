<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Markdown extends Model
{
    use HasFactory;

    protected $table = 'markdown';

    protected $fillable = [
        'doctorId',
        'specialtyId',
        'clinicId',
        'description',
        'contentHTML',
        'contentMarkdown',
    ];

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctorId');
    }

    public function specialty(): BelongsTo
    {
        return $this->belongsTo(Specialty::class, 'specialtyId');
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'clinicId');
    }
}
