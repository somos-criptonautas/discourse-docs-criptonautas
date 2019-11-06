import { default as computed } from "ember-addons/ember-computed-decorators";
import KnowledgeExplorer from "discourse/plugins/discourse-knowledge-explorer/discourse/models/knowledge-explorer";

function mergeCategories(results) {
  const categories = Discourse.Category.list();
  const topics = results.topics.topic_list.topics.map(t => {
    t.category = categories.findBy("id", t.category_id);
    return t;
  });

  results.topics.topic_list.topics = topics;

  return results;
}

export default Ember.Controller.extend({
  application: Ember.inject.controller(),
  queryParams: {
    filterCategories: "category",
    filterTags: "tags",
    searchTerm: "search",
    selectedTopic: "topic"
  },
  isLoading: false,
  isLoadingMore: false,
  loadMoreUrl: Ember.computed.alias("model.topics.load_more_url"),
  isTopicLoading: false,
  categories: Ember.computed.readOnly("model.categories"),
  topics: Ember.computed.alias("model.topics.topic_list.topics"),
  tags: Ember.computed.readOnly("model.tags"),
  filterTags: null,
  filterCategories: null,
  searchTerm: null,
  selectedTopic: null,
  topic: null,

  @computed("loadMoreUrl")
  canLoadMore(loadMoreUrl) {
    if (loadMoreUrl === null || this.isLoadingMore) {
      return false;
    }
    return true;
  },

  @computed("searchTerm")
  isSearching(searchTerm) {
    return !!searchTerm;
  },

  @computed("isSearching", "topics")
  searchCount(isSearching, topics) {
    if (isSearching) return topics.length;
  },

  emptySearchResults: Ember.computed.equal("searchCount", 0),

  @computed("filterTags")
  filtered(filterTags) {
    return !!filterTags;
  },

  actions: {
    setSelectedTopic(topicId) {
      this.setProperties({
        isTopicLoading: true,
        selectedTopic: topicId
      });

      KnowledgeExplorer.getTopic(topicId).then(result => {
        this.setProperties({
          topic: result,
          isTopicLoading: false
        });
      });
    },

    updateSelectedTags(tag) {
      let filter = this.filterTags;
      if (filter && filter.includes(tag.id)) {
        filter = filter
          .replace(tag.id, "")
          .replace("|", "|")
          .replace(/^\|+|\|+$/g, "");
      } else if (filter) {
        filter = `${filter}|${tag.id}`;
      } else {
        filter = tag.id;
      }

      this.setProperties({
        filterTags: filter,
        selectedTopic: null
      });

      this.send("refreshModel");
    },
    updateSelectedCategories(category) {
      let filter = this.filterCategories;
      if (filter && filter.includes(category.id)) {
        filter = filter
          .replace(category.id, "")
          .replace("|", "|")
          .replace(/^\|+|\|+$/g, "");
      } else if (filter) {
        filter = `${filter}|${category.id}`;
      } else {
        filter = category.id;
      }

      this.setProperties({
        filterCategories: filter,
        selectedTopic: null
      });

      this.send("refreshModel");
    },

    performSearch(term) {
      if (term === "") {
        this.set("searchTerm", null);
        this.send("refreshModel");
        return false;
      }

      if (term.length < this.siteSettings.min_search_term_length) {
        return false;
      }

      this.setProperties({
        searchTerm: term,
        selectedTopic: null
      });

      this.send("refreshModel");
    },

    loadMore() {
      if (this.canLoadMore) {
        this.set("isLoadingMore", true);

        KnowledgeExplorer.loadMore(this.loadMoreUrl).then(result => {
          result = mergeCategories(result);
          const topics = this.topics.concat(result.topics.topic_list.topics);

          this.setProperties({
            topics,
            loadMoreUrl: result.topics.load_more_url || null,
            isLoadingMore: false
          });
        });
      }
    },

    refreshModel() {
      this.set("isLoading", true);

      const params = this.getProperties(
        "filterCategories",
        "filterTags",
        "searchTerm"
      );

      KnowledgeExplorer.list(params).then(result => {
        result = mergeCategories(result);
        this.setProperties({
          model: result,
          isLoading: false
        });
      });
    }
  }
});
