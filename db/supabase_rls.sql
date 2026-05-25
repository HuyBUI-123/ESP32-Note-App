alter table devices enable row level security;


create policy "Users can access own devices"
on devices
for all
using (auth.uid() = user_id);


