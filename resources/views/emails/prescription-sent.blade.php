<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Prescription Sent</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">
    <p>Hi {{ $booking->patient?->name ?? 'Patient' }},</p>

    <p>Thank you for attending your appointment with {{ $booking->doctor?->name ?? 'your doctor' }}.</p>

    <p>
        Appointment date: {{ $appointmentDate }}<br>
        Appointment time: {{ $appointmentTime }}
    </p>

    <p>Your prescription file is attached to this email. We wish you a smooth recovery.</p>

    <p>Thank you,<br>HealthSync</p>
</body>
</html>
