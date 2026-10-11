-- Metadata only. No wallet keys, buyer emails, capability tokens or payment signatures are selected.
select jsonb_build_object(
  'tables', coalesce((select jsonb_agg(jsonb_build_object(
    'name', c.relname, 'rls', c.relrowsecurity,
    'anonAccess', has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE'),
    'authenticatedAccess', has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE'),
    'serviceSelect', has_table_privilege('service_role',c.oid,'SELECT'),
    'serviceInsert', has_table_privilege('service_role',c.oid,'INSERT'),
    'serviceUpdate', has_table_privilege('service_role',c.oid,'UPDATE')
  ) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'),'[]'::jsonb),
  'policies', coalesce((select jsonb_agg(jsonb_build_object(
    'table',tablename,'name',policyname,'roles',roles,'command',cmd,
    'hasUsing',qual is not null,'hasCheck',with_check is not null,
    'usingExpression',qual,'checkExpression',with_check,
    'usesOwnerIdentity',position('auth.uid()' in coalesce(qual,'') || coalesce(with_check,'')) > 0
  ) order by tablename,policyname) from pg_policies where schemaname='public'),'[]'::jsonb),
  'columns', coalesce((select jsonb_agg(jsonb_build_object(
    'table',table_name,'name',column_name,'type',data_type,'nullable',is_nullable
  ) order by table_name,ordinal_position) from information_schema.columns where table_schema='public'),'[]'::jsonb),
  'paymentFunctions', coalesce((select jsonb_agg(jsonb_build_object(
    'name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'securityDefiner',p.prosecdef,
    'configuration',p.proconfig,'anonExecute',has_function_privilege('anon',p.oid,'EXECUTE'),
    'authenticatedExecute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
    'serviceExecute',has_function_privilege('service_role',p.oid,'EXECUTE')
  ) order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'track_b_%'),'[]'::jsonb),
  'indexes', coalesce((select jsonb_agg(jsonb_build_object('table',tablename,'name',indexname,'definition',indexdef)
    order by tablename,indexname) from pg_indexes where schemaname='public'),'[]'::jsonb),
  'constraints', coalesce((select jsonb_agg(jsonb_build_object(
    'table',c.relname,'name',k.conname,'definition',pg_get_constraintdef(k.oid)
  ) order by c.relname,k.conname) from pg_constraint k join pg_class c on c.oid=k.conrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),'[]'::jsonb),
  'realtimeTables', coalesce((select jsonb_agg(tablename order by tablename)
    from pg_publication_tables where pubname='supabase_realtime' and schemaname='public'),'[]'::jsonb),
  'readOnly',current_setting('transaction_read_only'),
  'preMigration',jsonb_build_object(
    'duplicateBuyerWalletGroups',(select count(*) from (
      select lower(wallet_address) from public.buyers where wallet_address is not null
      group by lower(wallet_address) having count(*)>1) d),
    'serviceRoleBypassesRls',(select rolbypassrls from pg_roles where rolname='service_role'),
    'canCreateInPublic',has_schema_privilege(current_user,'public','CREATE')
  ),
  'migrationHistoryPresent',to_regclass('supabase_migrations.schema_migrations') is not null
) as audit;
