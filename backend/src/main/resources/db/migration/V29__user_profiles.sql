ALTER TABLE user_profiles
    ADD COLUMN date_of_birth date,
    ADD COLUMN gender varchar(30) NOT NULL DEFAULT 'PREFER_NOT_TO_SAY'
        CHECK (gender IN ('MALE','FEMALE','PREFER_NOT_TO_SAY')),
    ADD COLUMN phone varchar(25),
    ADD COLUMN address varchar(500),
    ADD COLUMN profile_photo_data bytea,
    ADD COLUMN profile_photo_name varchar(255),
    ADD COLUMN profile_photo_content_type varchar(50),
    ADD COLUMN profile_photo_size integer,
    ADD COLUMN profile_photo_version bigint NOT NULL DEFAULT 0;

ALTER TABLE user_profiles ADD CONSTRAINT ck_profile_photo_complete CHECK (
    (profile_photo_data IS NULL AND profile_photo_name IS NULL AND profile_photo_content_type IS NULL AND profile_photo_size IS NULL)
    OR
    (profile_photo_data IS NOT NULL AND profile_photo_name IS NOT NULL AND profile_photo_content_type IS NOT NULL AND profile_photo_size > 0)
);

COMMENT ON COLUMN user_profiles.profile_photo_data IS 'Validated self-service profile image, maximum 2 MB.';
COMMENT ON COLUMN user_profiles.gender IS 'Controls the local default avatar when no profile image is present.';
