alter table items
  add column if not exists sourcing_model text not null default 'reservation'
  check (sourcing_model in ('reservation', 'direct'));

create index if not exists items_sourcing_model_idx on items (sourcing_model);
