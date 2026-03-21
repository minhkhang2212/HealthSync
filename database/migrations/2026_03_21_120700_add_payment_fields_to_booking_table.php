<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking', function (Blueprint $table) {
            $table->json('bookingDetails')->nullable()->after('patientContactEmail');
            $table->string('paymentMethod', 30)->default('pay_at_clinic')->after('statusId');
            $table->string('paymentStatus', 30)->default('pay_at_clinic')->after('paymentMethod');
            $table->unsignedInteger('paymentAmount')->nullable()->after('paymentStatus');
            $table->string('paymentCurrency', 10)->default('gbp')->after('paymentAmount');
            $table->string('stripeCheckoutSessionId')->nullable()->after('paymentCurrency');
            $table->string('stripePaymentIntentId')->nullable()->after('stripeCheckoutSessionId');
            $table->timestamp('paymentExpiresAt')->nullable()->after('stripePaymentIntentId');
            $table->timestamp('paidAt')->nullable()->after('paymentExpiresAt');

            $table->index('paymentMethod');
            $table->index('paymentStatus');
            $table->index('stripeCheckoutSessionId');
        });
    }

    public function down(): void
    {
        Schema::table('booking', function (Blueprint $table) {
            $table->dropIndex(['paymentMethod']);
            $table->dropIndex(['paymentStatus']);
            $table->dropIndex(['stripeCheckoutSessionId']);

            $table->dropColumn([
                'bookingDetails',
                'paymentMethod',
                'paymentStatus',
                'paymentAmount',
                'paymentCurrency',
                'stripeCheckoutSessionId',
                'stripePaymentIntentId',
                'paymentExpiresAt',
                'paidAt',
            ]);
        });
    }
};
