import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CreateGroupModal } from '@/components/comunidad/CreateGroupModal';

export const dynamic = 'force-dynamic';

export default async function ComunidadGruposPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let groups: any[] = [];
  if (user) {
    // Fetch groups user is a member of (bypass RLS)
    const { data: memberData, error } = await supabaseAdmin
      .from('group_members')
      .select('group_id, competition_groups(*)')
      .eq('user_id', user.id);
    
    if (error) {
       console.error('[ComunidadGruposPage] Error fetching groups:', error);
    }
    
    if (memberData) {
       groups = memberData.map(d => d.competition_groups);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-4">
        <div>
          <h2 className="text-xl font-bold text-on-background mb-1">Mis Grupos</h2>
          <p className="text-sm text-on-surface-variant">Compite con tus amigos en estos grupos activos.</p>
        </div>
        <CreateGroupModal />
      </div>

      {groups.length === 0 ? (
        <div className="bg-surface-container-low border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4 group hover:bg-surface-variant transition-all">
          <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-4xl">add</span>
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-background">Crea tu equipo</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Aún no estás en ningún grupo. ¡Crea uno e invita a tus amigos!</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div key={group.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 relative group">
              <div className="absolute top-0 right-0 p-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${group.status === 'active' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-variant text-on-surface-variant'}`}>
                  {group.status === 'active' ? 'En competencia' : group.status === 'waiting' ? 'Esperando' : 'Finalizado'}
                </span>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <span className="bg-surface-variant text-on-surface-variant px-2.5 py-1 rounded-lg text-xs font-bold w-fit uppercase tracking-wider">
                  {group.duration_months} meses
                </span>
                <h3 className="text-lg font-bold text-primary truncate" title={group.name}>{group.name}</h3>
              </div>
              
              <div className="mt-auto">
                <button className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all">
                  Ver grupo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
