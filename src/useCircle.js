import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export function useCircle(session) {
  const [circleId, setCircleId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    async function run() {
      // Do I already belong to a circle?
      const { data: mem } = await supabase.from('circle_members').select('circle_id').limit(1)
      if (mem && mem.length > 0) {
        setCircleId(mem[0].circle_id)
      } else {
        // Create one (the DB function also adds me as owner)
        const { data, error } = await supabase.rpc('create_circle_with_owner', {
          circle_name: 'My Care Circle',
        })
        if (!error) setCircleId(data)
      }
      setLoading(false)
    }
    run()
  }, [session])

  return { circleId, loading }
}