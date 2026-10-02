import * as migration_20261002_063454_initial from './20261002_063454_initial';
import * as migration_20261002_070938_report_and_resource_icons from './20261002_070938_report_and_resource_icons';
import * as migration_20261002_072548_territories_map from './20261002_072548_territories_map';
import * as migration_20261002_074726_home_evacuation from './20261002_074726_home_evacuation';
import * as migration_20261002_081925_navigation from './20261002_081925_navigation';
import * as migration_20261002_083239_localized_chips from './20261002_083239_localized_chips';
import * as migration_20261002_085609_videos from './20261002_085609_videos';
import * as migration_20261002_091402_trash from './20261002_091402_trash';
import * as migration_20261002_121436_has_english from './20261002_121436_has_english';

export const migrations = [
  {
    up: migration_20261002_063454_initial.up,
    down: migration_20261002_063454_initial.down,
    name: '20261002_063454_initial',
  },
  {
    up: migration_20261002_070938_report_and_resource_icons.up,
    down: migration_20261002_070938_report_and_resource_icons.down,
    name: '20261002_070938_report_and_resource_icons',
  },
  {
    up: migration_20261002_072548_territories_map.up,
    down: migration_20261002_072548_territories_map.down,
    name: '20261002_072548_territories_map',
  },
  {
    up: migration_20261002_074726_home_evacuation.up,
    down: migration_20261002_074726_home_evacuation.down,
    name: '20261002_074726_home_evacuation',
  },
  {
    up: migration_20261002_081925_navigation.up,
    down: migration_20261002_081925_navigation.down,
    name: '20261002_081925_navigation',
  },
  {
    up: migration_20261002_083239_localized_chips.up,
    down: migration_20261002_083239_localized_chips.down,
    name: '20261002_083239_localized_chips',
  },
  {
    up: migration_20261002_085609_videos.up,
    down: migration_20261002_085609_videos.down,
    name: '20261002_085609_videos',
  },
  {
    up: migration_20261002_091402_trash.up,
    down: migration_20261002_091402_trash.down,
    name: '20261002_091402_trash',
  },
  {
    up: migration_20261002_121436_has_english.up,
    down: migration_20261002_121436_has_english.down,
    name: '20261002_121436_has_english'
  },
];
