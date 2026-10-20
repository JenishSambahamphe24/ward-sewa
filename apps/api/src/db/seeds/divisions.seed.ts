import { DivisionHelper } from '@ward-sewa/nepal-utils';
import { sql } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { districts, localLevels, provinces, wards } from '../schema/index.ts';

const excluded = (column: string) => sql.raw(`excluded.${column}`);

export class DivisionsSeed {
  // Upserts, so re-running picks up renames and new wards. Never deletes: wards may be referenced.
  static async run(db: Db): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .insert(provinces)
        .values(DivisionHelper.provinces.map(({ code, name }) => ({ code, name })))
        .onConflictDoUpdate({ target: provinces.code, set: { name: excluded('name') } });

      await tx
        .insert(districts)
        .values(DivisionHelper.districts.map((d) => ({ ...d })))
        .onConflictDoUpdate({
          target: districts.code,
          set: { name: excluded('name'), provinceCode: excluded('province_code') },
        });

      await tx
        .insert(localLevels)
        .values(
          DivisionHelper.localLevels.map((l) => ({
            code: l.code,
            name: l.name,
            type: l.type,
            districtCode: l.districtCode,
            wardCount: l.wards,
          })),
        )
        .onConflictDoUpdate({
          target: localLevels.code,
          set: {
            name: excluded('name'),
            type: excluded('type'),
            districtCode: excluded('district_code'),
            wardCount: excluded('ward_count'),
          },
        });

      await tx
        .insert(wards)
        .values(
          DivisionHelper.localLevels.flatMap((l) =>
            Array.from({ length: l.wards }, (_, i) => ({ localLevelCode: l.code, wardNo: i + 1 })),
          ),
        )
        .onConflictDoNothing();
    });
  }
}
