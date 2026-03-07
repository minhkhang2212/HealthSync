<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Clinic extends Model
{
    use HasFactory;

    protected $table = 'clinic';

    protected $fillable = [
        'name',
        'address',
        'image',
        'description',
    ];

    public function markdowns(): HasMany
    {
        return $this->hasMany(Markdown::class, 'clinicId');
    }
}
