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
        Schema::create('allcodes', function (Blueprint $table) {
            $table->id();
            $table->string('key', 50);
            $table->string('type', 50);
            $table->string('valueEn', 255);
            $table->string('valueVi', 255);
            $table->timestamps();

            $table->index('type');
            $table->unique(['type', 'key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('allcodes');
    }
};
