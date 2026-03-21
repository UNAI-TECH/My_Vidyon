SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'students' AND table_schema = 'public';

SELECT view_definition 
FROM information_schema.views 
WHERE table_name = 'students' AND table_schema = 'public';
