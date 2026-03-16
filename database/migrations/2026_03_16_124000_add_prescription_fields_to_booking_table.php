<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking', function (Blueprint $table) {
            if (!Schema::hasColumn('booking', 'prescriptionSentAt')) {
                $table->timestamp('prescriptionSentAt')->nullable()->after('confirmationAttachment');
            }

            if (!Schema::hasColumn('booking', 'prescriptionAttachment')) {
                $table->string('prescriptionAttachment')->nullable()->after('prescriptionSentAt');
            }
        });
    }

    public function down(): void
    {
        Schema::table('booking', function (Blueprint $table) {
            if (Schema::hasColumn('booking', 'prescriptionAttachment')) {
                $table->dropColumn('prescriptionAttachment');
            }

            if (Schema::hasColumn('booking', 'prescriptionSentAt')) {
                $table->dropColumn('prescriptionSentAt');
            }
        });
    }
};
