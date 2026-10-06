<script setup>
import ModelForm from '../model/Form.vue'
defineOptions({ inheritAttrs: false })
</script>
<template>
  <ModelForm
    v-bind="$attrs"
    mobile
    ><template
      v-for="(_, name) in $slots"
      #[name]="scope"
      ><slot
        :name="name"
        v-bind="scope" /></template
  ></ModelForm>
</template>
