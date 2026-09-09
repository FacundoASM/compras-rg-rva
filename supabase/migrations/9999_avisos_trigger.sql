-- Ejecutar DESPUES de deployar la función notificar-pedido y configurar el secreto
-- RESEND_API_KEY. Reemplazar los placeholders antes de correrlo (Dashboard > Settings > API
-- para la URL del proyecto y una service_role o anon key con permiso de invocar functions).

create extension if not exists pg_net;

create or replace function avisar_pedido_nuevo()
returns trigger as $$
declare
  destinatario text;
begin
  select valor->>'aprobador' into destinatario from configuracion where clave = 'avisos_email';
  if destinatario is not null then
    perform net.http_post(
      url := 'https://ksigpzmjkuqdklzqfhzn.supabase.co/functions/v1/notificar-pedido',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer REEMPLAZAR_ANON_KEY'),
      body := jsonb_build_object(
        'tipo', 'nuevo',
        'numero', new.numero,
        'area', new.area,
        'solicitante', (select nombre from perfiles where id = new.solicitante_id),
        'destinatarios', jsonb_build_array(destinatario)
      )
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_avisar_pedido_nuevo
after insert on pedidos
for each row execute function avisar_pedido_nuevo();

create or replace function avisar_pedido_aprobado()
returns trigger as $$
declare
  destinatarios jsonb;
begin
  if new.estado = 'aprobado' and old.estado is distinct from 'aprobado' then
    select valor->'compras' into destinatarios from configuracion where clave = 'avisos_email';
    if destinatarios is not null then
      perform net.http_post(
        url := 'https://ksigpzmjkuqdklzqfhzn.supabase.co/functions/v1/notificar-pedido',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer REEMPLAZAR_ANON_KEY'),
        body := jsonb_build_object(
          'tipo', 'aprobado',
          'numero', new.numero,
          'area', new.area,
          'solicitante', (select nombre from perfiles where id = new.solicitante_id),
          'destinatarios', destinatarios
        )
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_avisar_pedido_aprobado
after update on pedidos
for each row execute function avisar_pedido_aprobado();
