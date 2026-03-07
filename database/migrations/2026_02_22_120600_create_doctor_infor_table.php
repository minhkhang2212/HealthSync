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
        Schema::create('doctor_infor', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctorId')->constrained('users')->cascadeOnDelete();
            $table->string('priceId', 20)->nullable();
            $table->string('provinceId', 20)->nullable();
            $table->string('paymentId', 20)->nullable();
            $table->string('addressClinic', 255)->nullable();
            $table->string('nameClinic', 255)->nullable();
            $table->text('note')->nullable();
            $table->unsignedBigInteger('count')->default(0);
            $table->timestamps();

            $table->unique('doctorId');
            $table->index('priceId');
            $table->index('provinceId');
            $table->index('paymentId');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('doctor_infor');
    }
};
