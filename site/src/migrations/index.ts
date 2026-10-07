import * as migration_20261002_063454_initial from './20261002_063454_initial';
import * as migration_20261002_070938_report_and_resource_icons from './20261002_070938_report_and_resource_icons';
import * as migration_20261002_072548_territories_map from './20261002_072548_territories_map';
import * as migration_20261002_074726_home_evacuation from './20261002_074726_home_evacuation';
import * as migration_20261002_081925_navigation from './20261002_081925_navigation';
import * as migration_20261002_083239_localized_chips from './20261002_083239_localized_chips';
import * as migration_20261002_085609_videos from './20261002_085609_videos';
import * as migration_20261002_091402_trash from './20261002_091402_trash';
import * as migration_20261002_121436_has_english from './20261002_121436_has_english';
import * as migration_20261005_103523_visits from './20261005_103523_visits';
import * as migration_20261005_110019_seo from './20261005_110019_seo';
import * as migration_20261005_111047_resources from './20261005_111047_resources';
import * as migration_20261005_111134_home_resources_moved from './20261005_111134_home_resources_moved';
import * as migration_20261005_124910_contacts_socials from './20261005_124910_contacts_socials';
import * as migration_20261007_085753_search_text from './20261007_085753_search_text';
import * as migration_20261007_105115_news_topics from './20261007_105115_news_topics';
import * as migration_20261007_114553_news_categories from './20261007_114553_news_categories';
import * as migration_20261007_115506_remove_news_tag from './20261007_115506_remove_news_tag';

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
    name: '20261002_121436_has_english',
  },
  {
    up: migration_20261005_103523_visits.up,
    down: migration_20261005_103523_visits.down,
    name: '20261005_103523_visits',
  },
  {
    up: migration_20261005_110019_seo.up,
    down: migration_20261005_110019_seo.down,
    name: '20261005_110019_seo',
  },
  {
    up: migration_20261005_111047_resources.up,
    down: migration_20261005_111047_resources.down,
    name: '20261005_111047_resources',
  },
  {
    up: migration_20261005_111134_home_resources_moved.up,
    down: migration_20261005_111134_home_resources_moved.down,
    name: '20261005_111134_home_resources_moved',
  },
  {
    up: migration_20261005_124910_contacts_socials.up,
    down: migration_20261005_124910_contacts_socials.down,
    name: '20261005_124910_contacts_socials',
  },
  {
    up: migration_20261007_085753_search_text.up,
    down: migration_20261007_085753_search_text.down,
    name: '20261007_085753_search_text',
  },
  {
    up: migration_20261007_105115_news_topics.up,
    down: migration_20261007_105115_news_topics.down,
    name: '20261007_105115_news_topics',
  },
  {
    up: migration_20261007_114553_news_categories.up,
    down: migration_20261007_114553_news_categories.down,
    name: '20261007_114553_news_categories',
  },
  {
    up: migration_20261007_115506_remove_news_tag.up,
    down: migration_20261007_115506_remove_news_tag.down,
    name: '20261007_115506_remove_news_tag'
  },
];
