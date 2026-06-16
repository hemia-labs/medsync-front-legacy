<template>

<div class="px-0 bg-transparent border-none border border-transparent rounded-xl"  >
    <v-card-title v-if="!hidesearch">
      <v-text-field
        v-model="search"
        append-icon="mdi-magnify"
        label="Termino de búsqueda"
        hide-details

      ></v-text-field>
    </v-card-title>
    <div class="px-0 py-0 bg-transparent rounded-xl">
        <v-data-table
        :headers="headers"
        :items="values"
        :search="search"
        :class="'elevation-'+elevation"
        class="custom_table_class overflow-x-auto"
        :no-data-text="'No se encontraron resultados'"
        :multi-sort="false"
        :hide-default-footer="hidefooter"
        :hide-default-header="hidedefaultheaders"
        elevation="0"
        style="box-shadow: 0px 4px 6px 2px rgba(0, 0, 0, 0.25); border-radius: 12px;"
        :items-per-page="itemsperpage"
        @page-count="pageCount = $event"
        :page.sync="page"
        >
        <template
            v-slot:header="{ props: { headers } }"
        >
        <thead>
            <tr class="sm:hidden md:contents w-min">
                <th v-for="(head, i) in headers" :key="i" class="text-center sm:text-center md:text-center lg:text-justify" :class="{'bg-primary-200': (i%2 == 0), 'bg-primary-100': (i%2 == 1) }">
                    <span  class="text-primary-900 font-sans font-bold text-lg">{{ head.text }}</span>
                </th>
            </tr>
        </thead>
        </template>
        <template v-slot:item="i">
            <tr class="rounded-tl-lg sm:contents md:table-row">
                <td v-for="(h, y) in i.headers" :key="y" class="text-primary-900 sm:w-full md:w-min sm:text-center md:text-center lg:text-justify font-sans sm:flex md:table-cell items-center" :class="{'bg-primary-200': (y%2 == 0), 'bg-primary-100': (y%2 == 1),  }">
                      <slot :name="h.value" :data="i.item" :header="h.text"><div class="flex  justify-between items-center w-full"><strong class="md:hidden text-left"> {{h.text ? h.text : '' }}</strong> <div class="sm:text-right md:text-center"> {{ i.item[h.value] }}</div> </div></slot>
                </td>
            </tr>
        </template>
        </v-data-table>
        <v-pagination
            v-if="hidepagination == false"
            class="mt-5"
            color="var(--color-primary-700)"
            v-model="page"
            :length="pageCount"
        ></v-pagination>
    </div>

  </div>

</template>

<script>
export default {
    props: {
        headers: {
            type: Array,
            default: function() {return []}
        },
        hidedefaultheaders: {
            type: Boolean,
            default: true
        },
        hidesearch: {
            type: Boolean,
            default: true
        },
        values: {
            type: Array,
            default: function() {return []}
        },
        hidepagination: {
            type: Boolean,
            default: true
        },
        hidefooter: {
            type: Boolean,
            default: true
        },
        elevation: {
            type: [Number, String],
            default: 0
        },
        itemsperpage: {
            type: [Number],
            default: 10
        }
    },
    data: function() {
        return {
            page: 1,
            pageCount: 0,
            search: '',
            headersProps: {
                mobile: true
            }
        }
    }

}
</script>

<style scoped>


.custom_table_class thead th:first-child {
  border-radius: 12px 0 0 0;
}
.custom_table_class thead th:last-child {
  border-radius:  0 12px 0 0;
}

.custom_table_class thead th:last-child {
  border-radius:  0 12px 0 0;
}


</style>

