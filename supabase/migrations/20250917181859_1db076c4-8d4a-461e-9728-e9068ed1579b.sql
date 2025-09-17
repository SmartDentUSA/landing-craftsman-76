-- Add new SFTP configuration fields to publication_settings table
ALTER TABLE public.publication_settings 
ADD COLUMN ftp_protocol text DEFAULT 'sftp',
ADD COLUMN ftp_port integer DEFAULT 22,
ADD COLUMN ftp_remote_path text DEFAULT 'public_html/blog';