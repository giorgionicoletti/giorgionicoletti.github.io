---
layout: archive
title: "More on my papers"
permalink: /posts/
author_profile: true
---

{% include base_path %}
{% assign postsByYear = site.posts | group_by_exp: "post", "post.date | date: '%Y'" %}
{% for year in postsByYear %}
  <h2>{{ year.name }}</h2>
  {% for post in year.items %}
    {% include archive-single-post.html %}
  {% endfor %}
{% endfor %}
