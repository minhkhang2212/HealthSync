<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('doctor_clinic_specialty', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctorId')->constrained('users')->cascadeOnDelete();
            $table->foreignId('clinicId')->constrained('clinic')->cascadeOnDelete();
            $table->foreignId('specialtyId')->constrained('specialty')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['doctorId', 'clinicId', 'specialtyId'], 'doctor_clinic_specialty_unique');
            $table->index('doctorId');
            $table->index('clinicId');
            $table->index('specialtyId');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('doctor_clinic_specialty');
    }
};
