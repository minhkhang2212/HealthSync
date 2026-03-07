<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Specialty extends Model
{
    use HasFactory;

    protected $table = 'specialty';

    protected $fillable = [
        'name',
        'description',
        'image',
    ];

    public function markdowns(): HasMany
    {
        return $this->hasMany(Markdown::class, 'specialtyId');
    }
}
