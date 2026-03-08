---
name: LDAP Issue
about: Report an issue with LDAP authentication or user sync
title: '[LDAP] '
labels: ldap, bug
assignees: ''

---

**LDAP Server Type**
- [ ] LLDAP
- [ ] OpenLDAP
- [ ] Active Directory
- [ ] Other: ___

**Auth Mode**
- [ ] Internal + LDAP
- [ ] Only LDAP

**NPM Version**
<!-- What version is shown on the login page? -->


**LDAP Configuration** (redact passwords!)
<!-- Please provide your LDAP settings (without passwords) -->
- Host:
- Port:
- Use SSL/TLS: Yes / No
- Bind DN:
- Base DN:
- Search Filter:
- Email Attribute:
- Name Attribute:
- Group Attribute:

**Describe the issue**
<!-- What is happening? Login fails? Users not syncing? Groups not mapping? -->


**Docker Logs**
<!-- Run `docker logs <container_name> 2>&1 | grep -i ldap` and paste the output -->
```
paste logs here
```

**Expected behavior**
<!-- What did you expect to happen? -->


**Additional context**
<!-- Any other relevant information -->
