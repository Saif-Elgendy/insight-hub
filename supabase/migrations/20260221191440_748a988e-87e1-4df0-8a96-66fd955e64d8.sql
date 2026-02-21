
-- Add columns for meeting link, phone number, and communication platform
ALTER TABLE public.consultations 
ADD COLUMN meeting_link text,
ADD COLUMN patient_phone text,
ADD COLUMN communication_platform text;

-- communication_platform values: 'zoom', 'teams', 'google_meet', 'webex', 'phone'
