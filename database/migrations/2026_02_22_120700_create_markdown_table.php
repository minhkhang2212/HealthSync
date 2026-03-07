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
        Schema::create('markdown', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctorId')->constrained('users')->cascadeOnDelete();
            $table->foreignId('specialtyId')->nullable()->constrained('specialty')->nullOnDelete();
            $table->foreignId('clinicId')->nullable()->constrained('clinic')->nullOnDelete();
            $table->string('description', 500)->nullable();
            $table->longText('contentHTML');
            $table->longText('contentMarkdown');
            $table->timestamps();

            $table->unique('doctorId');
            $table->index('specialtyId');
            $table->index('clinicId');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('markdown');
    }
};
