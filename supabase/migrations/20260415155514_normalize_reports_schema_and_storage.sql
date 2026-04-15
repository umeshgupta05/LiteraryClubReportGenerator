-- Normalize reports table column spellings to lowercase and create required storage bucket.

DO $$
BEGIN
  -- Rename legacy/camel case columns if they exist.
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='eventDate') THEN
    ALTER TABLE public.reports RENAME COLUMN "eventDate" TO eventdate;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='headerImage') THEN
    ALTER TABLE public.reports RENAME COLUMN "headerImage" TO headerimage;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='circularImage') THEN
    ALTER TABLE public.reports RENAME COLUMN "circularImage" TO circularimage;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='posterImage') THEN
    ALTER TABLE public.reports RENAME COLUMN "posterImage" TO posterimage;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='registrationImages') THEN
    ALTER TABLE public.reports RENAME COLUMN "registrationImages" TO registrationimages;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='eventImages') THEN
    ALTER TABLE public.reports RENAME COLUMN "eventImages" TO eventimages;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='winnerGroups') THEN
    ALTER TABLE public.reports RENAME COLUMN "winnerGroups" TO winnergroups;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='customSections') THEN
    ALTER TABLE public.reports RENAME COLUMN "customSections" TO customsections;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='sectionOrder') THEN
    ALTER TABLE public.reports RENAME COLUMN "sectionOrder" TO sectionorder;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='uploadedWordFile') THEN
    ALTER TABLE public.reports RENAME COLUMN "uploadedWordFile" TO uploadedwordfile;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='shareCode') THEN
    ALTER TABLE public.reports RENAME COLUMN "shareCode" TO sharecode;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='rejectionNote') THEN
    ALTER TABLE public.reports RENAME COLUMN "rejectionNote" TO rejectionnote;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='createdBy') THEN
    ALTER TABLE public.reports RENAME COLUMN "createdBy" TO createdby;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='creatorName') THEN
    ALTER TABLE public.reports RENAME COLUMN "creatorName" TO creatorname;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='createdAt') THEN
    ALTER TABLE public.reports RENAME COLUMN "createdAt" TO createdat;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='updatedAt') THEN
    ALTER TABLE public.reports RENAME COLUMN "updatedAt" TO updatedat;
  END IF;
END $$;

-- Ensure required columns exist with exact lowercase spellings.
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS eventdate text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS headerimage text,
  ADD COLUMN IF NOT EXISTS circularimage text,
  ADD COLUMN IF NOT EXISTS posterimage text,
  ADD COLUMN IF NOT EXISTS registrationimages text,
  ADD COLUMN IF NOT EXISTS eventimages text,
  ADD COLUMN IF NOT EXISTS winnergroups text,
  ADD COLUMN IF NOT EXISTS customsections text,
  ADD COLUMN IF NOT EXISTS sectionorder text,
  ADD COLUMN IF NOT EXISTS uploadedwordfile text,
  ADD COLUMN IF NOT EXISTS sharecode text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS rejectionnote text,
  ADD COLUMN IF NOT EXISTS createdby text,
  ADD COLUMN IF NOT EXISTS creatorname text,
  ADD COLUMN IF NOT EXISTS createdat timestamptz,
  ADD COLUMN IF NOT EXISTS updatedat timestamptz;

ALTER TABLE public.reports
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN eventdate SET NOT NULL;

ALTER TABLE public.reports
  ALTER COLUMN registrationimages SET DEFAULT '[]',
  ALTER COLUMN eventimages SET DEFAULT '[]',
  ALTER COLUMN winnergroups SET DEFAULT '[]',
  ALTER COLUMN customsections SET DEFAULT '[]',
  ALTER COLUMN headerimage SET DEFAULT 'header-1.png',
  ALTER COLUMN status SET DEFAULT 'draft',
  ALTER COLUMN createdat SET DEFAULT now(),
  ALTER COLUMN updatedat SET DEFAULT now();

-- Ensure sharecode uniqueness.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reports_sharecode_key'
      AND conrelid = 'public.reports'::regclass
  ) THEN
    ALTER TABLE public.reports ADD CONSTRAINT reports_sharecode_key UNIQUE (sharecode);
  END IF;
END $$;

-- Create uploads storage bucket once.
INSERT INTO storage.buckets (id, name, public)
SELECT 'uploads', 'uploads', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'uploads'
);

-- Storage policies for public app usage.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read uploads'
  ) THEN
    CREATE POLICY "Public read uploads"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'uploads');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public insert uploads'
  ) THEN
    CREATE POLICY "Public insert uploads"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'uploads');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public update uploads'
  ) THEN
    CREATE POLICY "Public update uploads"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'uploads')
    WITH CHECK (bucket_id = 'uploads');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public delete uploads'
  ) THEN
    CREATE POLICY "Public delete uploads"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'uploads');
  END IF;
END $$;

