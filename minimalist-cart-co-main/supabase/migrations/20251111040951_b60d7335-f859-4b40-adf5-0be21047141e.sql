-- Add shipping information columns to orders table
ALTER TABLE public.orders 
ADD COLUMN customer_name TEXT,
ADD COLUMN phone TEXT,
ADD COLUMN address TEXT,
ADD COLUMN city TEXT,
ADD COLUMN district TEXT,
ADD COLUMN ward TEXT,
ADD COLUMN notes TEXT;