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

This is a my collaboration network: the color of each node specifies either a <span style="color:#d6d2d2;font-weight:600;">co-author</span>, a <span style="color:#79addc;font-weight:600;">preprint</span> or <span style="color:#9e1910;font-weight:600;">journal article</span>. Click on a node for more information.
 <iframe src="/collab_net/network.html" height="300" width="100%" style="border: none"></iframe>
<br><br>

{% for post in site.publications reversed %}
  {% include archive-single-publication.html %}
{% endfor %}
