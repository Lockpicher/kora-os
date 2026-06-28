create or replace function uuid_generate_v7()
returns uuid
as $$
declare
  unix_ts_ms bytea;
  uuid_bytes bytea;
begin
  unix_ts_ms = substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
  uuid_bytes = gen_random_bytes(16);
  uuid_bytes = set_byte(uuid_bytes, 0, get_byte(unix_ts_ms, 0));
  uuid_bytes = set_byte(uuid_bytes, 1, get_byte(unix_ts_ms, 1));
  uuid_bytes = set_byte(uuid_bytes, 2, get_byte(unix_ts_ms, 2));
  uuid_bytes = set_byte(uuid_bytes, 3, get_byte(unix_ts_ms, 3));
  uuid_bytes = set_byte(uuid_bytes, 4, get_byte(unix_ts_ms, 4));
  uuid_bytes = set_byte(uuid_bytes, 5, get_byte(unix_ts_ms, 5));
  uuid_bytes = set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
  uuid_bytes = set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
  return encode(uuid_bytes, 'hex')::uuid;
end
$$ language plpgsql volatile;
