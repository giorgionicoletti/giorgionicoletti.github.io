---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---

{% if author.googlescholar %}
  You can also find my articles on <u><a href="{{author.googlescholar}}">my Google Scholar profile</a>.</u>
{% endif %}

{% include base_path %}

Below you can find the list of all my publications and a network representing my work. The color of each node specifies if it represents <span style="color:#9BA1A6">co-authors</span>, <span style="color:#dbbb2a">preprints</span> or <span style="color:#9e1910">journal articles</span>. Click on a node for more information.
 <iframe src="/collab_net/network.html" height="300" width="100%" style="border: none"></iframe>
<br><br>

{% for post in site.publications reversed %}
  {% include archive-single-publication.html %}
{% endfor %}
